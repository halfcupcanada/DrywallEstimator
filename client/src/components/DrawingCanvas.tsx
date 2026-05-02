/**
 * Design: Clean Construction App
 * - Off-white canvas with subtle dot grid
 * - Blue walls (#2563EB), orange active/preview wall (#F97316)
 * - Snap indicators as cyan circles
 * - Dimension labels as floating badges
 *
 * Touch support:
 * - Single finger tap = place wall point (wall tool) or select (select tool)
 * - Single finger drag = pan (always, unless actively drawing)
 * - Two finger pinch = zoom
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
  snapToAngle,
  wallLength,
  wallMidpoint,
  GRID_SIZE,
  SNAP_RADIUS,
} from "@/lib/snap";
import type { Point, Wall } from "@/store/useDrawingStore";

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
  // Keep a ref to the latest viewport so touch handlers (which close over stale state) can read it
  const viewportRef = useRef(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);

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
      x: (stagePos.x - viewport.x) / viewport.scale,
      y: (stagePos.y - viewport.y) / viewport.scale,
    }),
    [viewport]
  );

  // Resolve a raw canvas point through snapping pipeline
  const resolvePoint = useCallback(
    (raw: Point, shiftHeld: boolean): { point: Point; snapped: boolean } => {
      const wallSnap = snapToWalls(raw, walls, viewport.scale);
      if (wallSnap.snapped) return wallSnap;
      let pt = snapToGrid(raw);
      if (shiftHeld && drawingStart) {
        pt = snapToAngle(drawingStart, pt);
      } else if (drawingStart) {
        const dx = Math.abs(pt.x - drawingStart.x);
        const dy = Math.abs(pt.y - drawingStart.y);
        if (dx > dy) pt = { x: pt.x, y: drawingStart.y };
        else pt = { x: drawingStart.x, y: pt.y };
      }
      return { point: pt, snapped: false };
    },
    [walls, viewport.scale, drawingStart]
  );

  // ── Mouse events ──────────────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const raw = stageToCanvas(pos);
      const { point, snapped } = resolvePoint(raw, e.evt.shiftKey);
      setCursorPos(point);
      setSnapIndicator(snapped ? point : null);
    },
    [stageToCanvas, resolvePoint]
  );

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== "wall") return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const raw = stageToCanvas(pos);
      const { point } = resolvePoint(raw, e.evt.shiftKey);
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        const len = wallLength({ start: drawingStart, end: point });
        if (len > 5) addWall({ start: drawingStart, end: point, height: defaultWallHeight });
        setDrawingStart(point);
      }
    },
    [activeTool, stageToCanvas, resolvePoint, drawingStart, setDrawingStart, addWall, defaultWallHeight]
  );

  const handleDblClick = useCallback(() => {
    if (activeTool === "wall") setDrawingStart(null);
  }, [activeTool, setDrawingStart]);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDrawingStart(null); setSelectedWallId(null); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedWallId) {
        deleteWall(selectedWallId);
        setSelectedWallId(null);
      }
    },
    [setDrawingStart, setSelectedWallId, deleteWall, selectedWallId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Mouse wheel zoom ──────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const scaleBy = 1.08;
      const oldScale = viewport.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const newScale = e.evt.deltaY < 0
        ? Math.min(oldScale * scaleBy, 8)
        : Math.max(oldScale / scaleBy, 0.1);
      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };
      setViewport({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [viewport, setViewport]
  );

  // ── Mouse pan ─────────────────────────────────────────────────────────────

  const isPanning = useRef(false);
  const lastPan = useRef<Point>({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === "pan" || e.evt.button === 1) {
        isPanning.current = true;
        lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
        e.evt.preventDefault();
      }
    },
    [activeTool]
  );

  const handleMouseMoveForPan = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanning.current) return;
      const dx = e.evt.clientX - lastPan.current.x;
      const dy = e.evt.clientY - lastPan.current.y;
      lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
      setViewport({ ...viewport, x: viewport.x + dx, y: viewport.y + dy });
    },
    [viewport, setViewport]
  );

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  // ── Touch events ──────────────────────────────────────────────────────────

  const lastTouchDist = useRef<number | null>(null);
  const lastTouchMid = useRef<Point | null>(null);
  const touchStartPos = useRef<Point | null>(null);
  const touchMoved = useRef(false);
  // Track viewport at touch start for pinch
  const viewportAtPinchStart = useRef(viewport);

  const getTouchDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchMid = (t1: Touch, t2: Touch): Point => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  // Get stage-relative position from a client point
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
      } else if (e.touches.length === 2) {
        lastTouchDist.current = getTouchDistance(e.touches[0], e.touches[1]);
        lastTouchMid.current = getTouchMid(e.touches[0], e.touches[1]);
        viewportAtPinchStart.current = { ...viewport };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastPan.current.x;
        const dy = e.touches[0].clientY - lastPan.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchMoved.current = true;
        lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        // Always pan on single-finger move (even in wall tool — tap to place)
        // Note: viewport is captured in closure; we use a ref to get latest value
        setViewport({ ...viewportRef.current, x: viewportRef.current.x + dx, y: viewportRef.current.y + dy });
      } else if (e.touches.length === 2 && lastTouchDist.current !== null && lastTouchMid.current !== null) {
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const newMid = getTouchMid(e.touches[0], e.touches[1]);
        const scaleChange = newDist / lastTouchDist.current;
        const vp = viewportAtPinchStart.current;
        const stageMid = clientToStage(newMid.x, newMid.y);

        const newScale = Math.min(Math.max(vp.scale * scaleChange, 0.1), 8);
        const originX = (stageMid.x - vp.x) / vp.scale;
        const originY = (stageMid.y - vp.y) / vp.scale;

        setViewport({
          scale: newScale,
          x: stageMid.x - originX * newScale + (newMid.x - lastTouchMid.current.x),
          y: stageMid.y - originY * newScale + (newMid.y - lastTouchMid.current.y),
        });
        lastTouchMid.current = newMid;
        lastTouchDist.current = newDist;
        viewportAtPinchStart.current = {
          scale: newScale,
          x: stageMid.x - originX * newScale + (newMid.x - (lastTouchMid.current?.x ?? newMid.x)),
          y: stageMid.y - originY * newScale + (newMid.y - (lastTouchMid.current?.y ?? newMid.y)),
        };
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1 && !touchMoved.current && activeTool === "wall") {
        // Tap = place wall point
        const touch = e.changedTouches[0];
        const stagePos = clientToStage(touch.clientX, touch.clientY);
        const raw = stageToCanvas(stagePos);
        const { point } = resolvePoint(raw, false);

        if (!drawingStart) {
          setDrawingStart(point);
          setCursorPos(point);
        } else {
          const len = wallLength({ start: drawingStart, end: point });
          if (len > 5) addWall({ start: drawingStart, end: point, height: defaultWallHeight });
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
  }, [activeTool, viewport, setViewport, stageToCanvas, resolvePoint, drawingStart, setDrawingStart, addWall, defaultWallHeight, clientToStage]);

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
          <Circle key={key++} x={x} y={y} radius={1 / viewport.scale} fill="#CBD5E1" listening={false} />
        );
      }
    }
    return dots;
  };

  const wallColor = "#2563EB";
  const selectedColor = "#F97316";
  const previewColor = "#F97316";
  const wallThickness = 4;

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{
        cursor: activeTool === "pan" ? "grab" : activeTool === "wall" ? "crosshair" : "default",
        background: "#F8FAFC",
        touchAction: "none",
      }}
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
            onClick={() => { if (activeTool === "select") setSelectedWallId(wall.id === selectedWallId ? null : wall.id); }}
          />
        ))}

        {/* Preview wall while drawing */}
        {activeTool === "wall" && drawingStart && cursorPos && (
          <Group>
            <Line
              points={[drawingStart.x, drawingStart.y, cursorPos.x, cursorPos.y]}
              stroke={previewColor}
              strokeWidth={wallThickness / viewport.scale}
              dash={[8 / viewport.scale, 4 / viewport.scale]}
              listening={false}
            />
            <Circle x={drawingStart.x} y={drawingStart.y} radius={5 / viewport.scale} fill={previewColor} listening={false} />
            <Circle x={cursorPos.x} y={cursorPos.y} radius={5 / viewport.scale} fill={previewColor} listening={false} />
            <DimensionLabel start={drawingStart} end={cursorPos} scale={viewport.scale} color={previewColor} pxPerFoot={pxPerFoot} />
          </Group>
        )}

        {/* Snap indicator */}
        {snapIndicator && (
          <Circle
            x={snapIndicator.x} y={snapIndicator.y}
            radius={SNAP_RADIUS / viewport.scale}
            stroke="#06B6D4"
            strokeWidth={1.5 / viewport.scale}
            fill="transparent"
            listening={false}
          />
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
    <Group onClick={onClick}>
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke="transparent"
        strokeWidth={20 / scale}
        hitStrokeWidth={20 / scale}
      />
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke={color}
        strokeWidth={thickness / scale}
        lineCap="round"
        listening={false}
      />
      <Circle x={wall.start.x} y={wall.start.y} radius={selected ? 6 / scale : 4 / scale} fill={selected ? color : "#fff"} stroke={color} strokeWidth={2 / scale} listening={false} />
      <Circle x={wall.end.x} y={wall.end.y} radius={selected ? 6 / scale : 4 / scale} fill={selected ? color : "#fff"} stroke={color} strokeWidth={2 / scale} listening={false} />
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
