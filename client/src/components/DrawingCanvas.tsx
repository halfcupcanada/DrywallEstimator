/**
 * Design: Clean Construction App
 * - Off-white canvas with subtle dot grid
 * - Blue walls (#2563EB), orange active/preview wall (#F97316)
 * - Snap indicators as cyan circles
 * - Dimension labels as floating badges
 *
 * Drawing model:
 * - Click to place start point, click again to place end (chain continues)
 * - OR click-drag-release to draw a wall in one gesture
 * - Double-click or Esc to end the current chain
 * - Shift = orthogonal lock (horizontal/vertical only)
 * - Without Shift: free-angle drawing, grid snap only
 *
 * Touch support:
 * - Tap = place wall point
 * - Drag (1 finger, not drawing) = pan
 * - Two-finger pinch = zoom
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Circle,
  Text,
  Rect,
  Image as KonvaImage,
  Group,
} from "react-konva";
import type Konva from "konva";
import { useDrawingStore } from "@/store/useDrawingStore";
import {
  snapToWalls,
  snapToGrid,
  wallLength,
  wallMidpoint,
  GRID_SIZE,
  SNAP_RADIUS,
} from "@/lib/snap";
import type { Point, Wall } from "@/store/useDrawingStore";
import { detectRooms } from "@/lib/roomDetect";

function formatLength(px: number, pxPerFoot: number): string {
  const feet = px / pxPerFoot;
  const wholeFeet = Math.floor(feet);
  const inches = Math.round((feet - wholeFeet) * 12);
  if (inches === 0) return `${wholeFeet}'`;
  if (inches === 12) return `${wholeFeet + 1}'`;
  return `${wholeFeet}' ${inches}"`;
}

interface Props {
  width: number;
  height: number;
}

export default function DrawingCanvas({ width, height }: Props) {
  const {
    activeTool,
    walls,
    addWall,
    deleteWall,
    drawingStart,
    setDrawingStart,
    selectedWallId,
    setSelectedWallId,
    floorPlanUrl,
    floorPlanSize,
    viewport,
    setViewport,
    defaultWallHeight,
    pxPerFoot,
  } = useDrawingStore();

  const stageRef = useRef<Konva.Stage>(null);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null);
  const [floorPlanImg, setFloorPlanImg] = useState<HTMLImageElement | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);

  // Keep refs to latest values for event handlers that close over stale state
  const viewportRef = useRef(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  const drawingStartRef = useRef(drawingStart);
  useEffect(() => { drawingStartRef.current = drawingStart; }, [drawingStart]);
  const activeToolRef = useRef(activeTool);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

  // Load floor plan image
  useEffect(() => {
    if (!floorPlanUrl) { setFloorPlanImg(null); return; }
    const img = new window.Image();
    img.src = floorPlanUrl;
    img.onload = () => setFloorPlanImg(img);
  }, [floorPlanUrl]);

  // Convert stage pointer position to canvas coordinates
  const stageToCanvas = useCallback(
    (stagePos: Point): Point => ({
      x: (stagePos.x - viewportRef.current.x) / viewportRef.current.scale,
      y: (stagePos.y - viewportRef.current.y) / viewportRef.current.scale,
    }),
    []
  );

  // Apply snapping: endpoint snap first, then grid snap, then optional orthogonal lock
  const resolvePoint = useCallback(
    (raw: Point, orthoLock: boolean, chainStart: Point | null): { point: Point; snapped: boolean } => {
      // 1. Snap to existing wall endpoints
      const wallSnap = snapToWalls(raw, walls, viewportRef.current.scale);
      if (wallSnap.snapped) return wallSnap;

      // 2. Grid snap
      let pt = snapToGrid(raw);

      // 3. Orthogonal lock (Shift key) — only when we have a chain start
      if (orthoLock && chainStart) {
        const dx = Math.abs(pt.x - chainStart.x);
        const dy = Math.abs(pt.y - chainStart.y);
        if (dx > dy) pt = { x: pt.x, y: chainStart.y };
        else pt = { x: chainStart.x, y: pt.y };
      }

      return { point: pt, snapped: false };
    },
    [walls]
  );

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
      if (e.key === "Escape") { setDrawingStart(null); setSelectedWallId(null); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedWallId) {
        deleteWall(selectedWallId);
        setSelectedWallId(null);
      }
      if (e.key === "w" || e.key === "W") useDrawingStore.getState().setActiveTool("wall");
      if (e.key === "s" || e.key === "S") useDrawingStore.getState().setActiveTool("select");
      if (e.key === "p" || e.key === "P") useDrawingStore.getState().setActiveTool("pan");
      if (e.key === "o" || e.key === "O") useDrawingStore.getState().setActiveTool("opening");
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setDrawingStart, setSelectedWallId, deleteWall, selectedWallId]);

  // ── Mouse move — update cursor preview ───────────────────────────────────

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const raw = stageToCanvas(pos);
      const { point, snapped } = resolvePoint(raw, e.evt.shiftKey, drawingStartRef.current);
      setCursorPos(point);
      setSnapIndicator(snapped ? point : null);
    },
    [stageToCanvas, resolvePoint]
  );

  // ── Mouse pan (middle button or Pan tool) ────────────────────────────────

  const isPanning = useRef(false);
  const lastPan = useRef<Point>({ x: 0, y: 0 });
  // Track mousedown position to distinguish click vs drag in wall tool
  const mouseDownPos = useRef<Point | null>(null);
  const mouseDragged = useRef(false);
  // For drag-to-draw: track if we started a drag while in wall tool
  const dragDrawStart = useRef<Point | null>(null);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      mouseDownPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      mouseDragged.current = false;
      dragDrawStart.current = null;

      if (activeTool === "pan" || e.evt.button === 1) {
        isPanning.current = true;
        lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
        e.evt.preventDefault();
        return;
      }

      // In wall tool: record the mousedown canvas position for drag-to-draw
      if (activeTool === "wall" && e.evt.button === 0) {
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        const raw = stageToCanvas(pos);
        const { point } = resolvePoint(raw, e.evt.shiftKey, drawingStartRef.current);
        dragDrawStart.current = point;
      }
    },
    [activeTool, stageToCanvas, resolvePoint]
  );

  const handleMouseMoveForPan = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Track drag distance
      if (mouseDownPos.current) {
        const dx = e.evt.clientX - mouseDownPos.current.x;
        const dy = e.evt.clientY - mouseDownPos.current.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) mouseDragged.current = true;
      }

      if (!isPanning.current) return;
      const dx = e.evt.clientX - lastPan.current.x;
      const dy = e.evt.clientY - lastPan.current.y;
      lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
      const vp = viewportRef.current;
      setViewport({ ...vp, x: vp.x + dx, y: vp.y + dy });
    },
    [setViewport]
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      isPanning.current = false;

      // Drag-to-draw: if we dragged far enough in wall tool, commit the wall
      if (
        activeTool === "wall" &&
        e.evt.button === 0 &&
        mouseDragged.current &&
        dragDrawStart.current
      ) {
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        const raw = stageToCanvas(pos);
        const { point } = resolvePoint(raw, e.evt.shiftKey, dragDrawStart.current);
        const len = wallLength({ start: dragDrawStart.current, end: point });
        if (len > 10) {
          addWall({ start: dragDrawStart.current, end: point, height: defaultWallHeight });
          // Continue chain from end point
          setDrawingStart(point);
        }
        dragDrawStart.current = null;
        mouseDragged.current = false;
      }
    },
    [activeTool, stageToCanvas, resolvePoint, addWall, defaultWallHeight, setDrawingStart]
  );

  // ── Click — place wall point (only if not a drag) ─────────────────────────

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Ignore if this was actually a drag
      if (mouseDragged.current) return;
      if (activeTool !== "wall") return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const raw = stageToCanvas(pos);
      const { point } = resolvePoint(raw, e.evt.shiftKey, drawingStartRef.current);

      if (!drawingStartRef.current) {
        setDrawingStart(point);
      } else {
        const len = wallLength({ start: drawingStartRef.current, end: point });
        if (len > 5) {
          addWall({ start: drawingStartRef.current, end: point, height: defaultWallHeight });
        }
        setDrawingStart(point);
      }
    },
    [activeTool, stageToCanvas, resolvePoint, setDrawingStart, addWall, defaultWallHeight]
  );

  const handleDblClick = useCallback(() => {
    if (activeTool === "wall") setDrawingStart(null);
  }, [activeTool, setDrawingStart]);

  // ── Mouse wheel zoom ──────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const scaleBy = 1.1;
      const vp = viewportRef.current;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const newScale = e.evt.deltaY < 0
        ? Math.min(vp.scale * scaleBy, 8)
        : Math.max(vp.scale / scaleBy, 0.1);
      const mousePointTo = {
        x: (pointer.x - vp.x) / vp.scale,
        y: (pointer.y - vp.y) / vp.scale,
      };
      setViewport({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [setViewport]
  );

  // ── Touch events ──────────────────────────────────────────────────────────

  const lastTouchDist = useRef<number | null>(null);
  const lastTouchMid = useRef<Point | null>(null);
  const touchStartPos = useRef<Point | null>(null);
  const touchMoved = useRef(false);

  const getTouchDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchMid = (t1: Touch, t2: Touch): Point => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const clientToStage = useCallback((clientX: number, clientY: number): Point => {
    const stage = stageRef.current;
    if (!stage) return { x: clientX, y: clientY };
    const container = stage.container().getBoundingClientRect();
    return { x: clientX - container.left, y: clientY - container.top };
  }, []);

  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchMoved.current = false;
        lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTouchDist.current = null;
      } else if (e.touches.length === 2) {
        lastTouchDist.current = getTouchDistance(e.touches[0], e.touches[1]);
        lastTouchMid.current = getTouchMid(e.touches[0], e.touches[1]);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastPan.current.x;
        const dy = e.touches[0].clientY - lastPan.current.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) touchMoved.current = true;
        lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        // Only pan if not in wall-drawing mode with an active chain start
        // (so dragging while drawing doesn't pan the canvas)
        if (activeToolRef.current !== "wall" || !drawingStartRef.current) {
          const vp = viewportRef.current;
          setViewport({ ...vp, x: vp.x + dx, y: vp.y + dy });
        }
      } else if (e.touches.length === 2 && lastTouchDist.current !== null && lastTouchMid.current !== null) {
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const newMid = getTouchMid(e.touches[0], e.touches[1]);
        const scaleChange = newDist / lastTouchDist.current;
        const vp = viewportRef.current;
        const stageMid = clientToStage(newMid.x, newMid.y);
        const newScale = Math.min(Math.max(vp.scale * scaleChange, 0.1), 8);
        const originX = (stageMid.x - vp.x) / vp.scale;
        const originY = (stageMid.y - vp.y) / vp.scale;
        const panDx = newMid.x - lastTouchMid.current.x;
        const panDy = newMid.y - lastTouchMid.current.y;
        setViewport({
          scale: newScale,
          x: stageMid.x - originX * newScale + panDx,
          y: stageMid.y - originY * newScale + panDy,
        });
        lastTouchMid.current = newMid;
        lastTouchDist.current = newDist;
        touchMoved.current = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1 && !touchMoved.current && activeToolRef.current === "wall") {
        const touch = e.changedTouches[0];
        const stagePos = clientToStage(touch.clientX, touch.clientY);
        const raw = stageToCanvas(stagePos);
        const chainStart = drawingStartRef.current;
        const { point } = resolvePoint(raw, false, chainStart);

        if (!chainStart) {
          setDrawingStart(point);
          setCursorPos(point);
        } else {
          const len = wallLength({ start: chainStart, end: point });
          if (len > 5) addWall({ start: chainStart, end: point, height: defaultWallHeight });
          setDrawingStart(point);
          setCursorPos(point);
        }
      }
      lastTouchDist.current = null;
      lastTouchMid.current = null;
    };

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [setViewport, stageToCanvas, resolvePoint, setDrawingStart, addWall, defaultWallHeight, clientToStage]);

  // ── Grid dots ─────────────────────────────────────────────────────────────

  const gridDots = () => {
    const dots: React.ReactNode[] = [];
    const startX = Math.floor(-viewport.x / viewport.scale / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(-viewport.y / viewport.scale / GRID_SIZE) * GRID_SIZE;
    const endX = startX + width / viewport.scale + GRID_SIZE * 2;
    const endY = startY + height / viewport.scale + GRID_SIZE * 2;
    let key = 0;
    for (let x = startX; x < endX; x += GRID_SIZE) {
      for (let y = startY; y < endY; y += GRID_SIZE) {
        dots.push(
          <Circle key={key++} x={x} y={y} radius={1.2 / viewport.scale} fill="#CBD5E1" listening={false} />
        );
      }
    }
    return dots;
  };

  const wallColor = "#2563EB";
  const selectedColor = "#F97316";
  const previewColor = "#F97316";
  const wallThickness = 4;

  // Detect closed rooms for polygon fill
  const rooms = detectRooms(walls, pxPerFoot);

  // Cursor style
  let cursor = "default";
  if (activeTool === "pan") cursor = "grab";
  else if (activeTool === "wall") cursor = "crosshair";

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{ cursor, background: "#F8FAFC", touchAction: "none" }}
      onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveForPan(e); }}
      onClick={handleClick}
      onDblClick={handleDblClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <Layer x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
        {/* Grid */}
        {gridDots()}

        {/* Floor plan image */}
        {floorPlanImg && floorPlanSize && (
          <KonvaImage
            image={floorPlanImg}
            x={0} y={0}
            width={floorPlanSize.width}
            height={floorPlanSize.height}
            opacity={0.45}
            listening={false}
          />
        )}

        {/* Room polygon fills */}
        {rooms.map((room, i) => (
          <Line
            key={`room-fill-${i}`}
            points={room.vertices.flatMap((v) => [v.x, v.y])}
            closed
            fill="#2563EB14"
            stroke="#2563EB40"
            strokeWidth={1.5 / viewport.scale}
            dash={[6 / viewport.scale, 4 / viewport.scale]}
            listening={false}
          />
        ))}

        {/* Completed walls */}
        {walls.map((wall) => (
          <WallSegment
            key={wall.id}
            wall={wall}
            selected={wall.id === selectedWallId}
            color={wall.id === selectedWallId ? selectedColor : wallColor}
            thickness={wallThickness}
            scale={viewport.scale}
            pxPerFoot={pxPerFoot}
            onClick={() => setSelectedWallId(wall.id === selectedWallId ? null : wall.id)}
          />
        ))}

        {/* Preview wall while drawing */}
        {activeTool === "wall" && drawingStart && cursorPos && (
          <Group listening={false}>
            <Line
              points={[drawingStart.x, drawingStart.y, cursorPos.x, cursorPos.y]}
              stroke={previewColor}
              strokeWidth={wallThickness / viewport.scale}
              dash={[8 / viewport.scale, 4 / viewport.scale]}
              opacity={0.8}
            />
            {/* Start anchor */}
            <Circle
              x={drawingStart.x} y={drawingStart.y}
              radius={7 / viewport.scale}
              fill={previewColor}
              opacity={0.9}
            />
            {/* End cursor dot */}
            <Circle
              x={cursorPos.x} y={cursorPos.y}
              radius={5 / viewport.scale}
              fill={previewColor}
              opacity={0.7}
            />
            <DimensionLabel start={drawingStart} end={cursorPos} scale={viewport.scale} color={previewColor} pxPerFoot={pxPerFoot} />
          </Group>
        )}

        {/* Snap indicator */}
        {snapIndicator && (
          <Circle
            x={snapIndicator.x} y={snapIndicator.y}
            radius={SNAP_RADIUS / viewport.scale}
            stroke="#06B6D4"
            strokeWidth={2 / viewport.scale}
            fill="#06B6D420"
            listening={false}
          />
        )}

        {/* Orthogonal lock hint lines when Shift is held */}
        {shiftHeld && drawingStart && cursorPos && activeTool === "wall" && (
          <Group listening={false}>
            <Line
              points={[drawingStart.x, drawingStart.y, cursorPos.x, drawingStart.y]}
              stroke="#06B6D4" strokeWidth={0.8 / viewport.scale}
              dash={[4 / viewport.scale, 4 / viewport.scale]} opacity={0.5}
            />
            <Line
              points={[drawingStart.x, drawingStart.y, drawingStart.x, cursorPos.y]}
              stroke="#06B6D4" strokeWidth={0.8 / viewport.scale}
              dash={[4 / viewport.scale, 4 / viewport.scale]} opacity={0.5}
            />
          </Group>
        )}
      </Layer>
    </Stage>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface WallSegmentProps {
  wall: Wall;
  selected: boolean;
  color: string;
  thickness: number;
  scale: number;
  pxPerFoot: number;
  onClick: () => void;
}

function WallSegment({ wall, selected, color, thickness, scale, pxPerFoot, onClick }: WallSegmentProps) {
  return (
    <Group onClick={onClick} onTap={onClick}>
      {/* Wide invisible hit area */}
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke="transparent"
        strokeWidth={24 / scale}
        hitStrokeWidth={24 / scale}
      />
      {/* Visible wall line */}
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke={color}
        strokeWidth={thickness / scale}
        lineCap="round"
        listening={false}
      />
      {/* Endpoint dots */}
      <Circle
        x={wall.start.x} y={wall.start.y}
        radius={selected ? 6 / scale : 4 / scale}
        fill={selected ? color : "#fff"}
        stroke={color} strokeWidth={2 / scale}
        listening={false}
      />
      <Circle
        x={wall.end.x} y={wall.end.y}
        radius={selected ? 6 / scale : 4 / scale}
        fill={selected ? color : "#fff"}
        stroke={color} strokeWidth={2 / scale}
        listening={false}
      />
      <DimensionLabel start={wall.start} end={wall.end} scale={scale} color={color} pxPerFoot={pxPerFoot} />
    </Group>
  );
}

interface DimensionLabelProps {
  start: Point;
  end: Point;
  scale: number;
  color: string;
  pxPerFoot: number;
}

function DimensionLabel({ start, end, scale, color, pxPerFoot }: DimensionLabelProps) {
  const mid = wallMidpoint({ start, end });
  const len = wallLength({ start, end });
  if (len < 10) return null;

  const label = formatLength(len, pxPerFoot);
  const fontSize = 11 / scale;
  const padding = 3 / scale;
  const bgWidth = label.length * fontSize * 0.6 + padding * 2;
  const bgHeight = fontSize + padding * 2;

  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  const normalAngle = angle > 90 || angle < -90 ? angle + 180 : angle;
  const rad = Math.atan2(end.y - start.y, end.x - start.x);
  const perpX = -Math.sin(rad) * (14 / scale);
  const perpY = Math.cos(rad) * (14 / scale);

  return (
    <Group x={mid.x + perpX} y={mid.y + perpY} rotation={normalAngle} listening={false}>
      <Rect
        x={-bgWidth / 2} y={-bgHeight / 2}
        width={bgWidth} height={bgHeight}
        fill="white" stroke={color} strokeWidth={0.8 / scale}
        cornerRadius={2 / scale} opacity={0.92}
      />
      <Text
        text={label} fontSize={fontSize}
        fontFamily="'IBM Plex Mono', monospace"
        fill={color} align="center"
        x={-bgWidth / 2} y={-bgHeight / 2 + padding * 0.5}
        width={bgWidth}
      />
    </Group>
  );
}
