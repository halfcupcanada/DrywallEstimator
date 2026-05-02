/**
 * Design: Clean Construction App
 * - Off-white canvas with subtle dot grid
 * - Blue walls (#2563EB), orange active/preview wall (#F97316)
 * - Snap indicators as cyan circles
 * - Dimension labels as floating badges
 *
 * Canvas coordinate system: 1 pixel = 1 inch at scale 1.
 * GRID_SIZE = 20px = 20 inches (roughly 1'8").
 * Users set a scale factor via the toolbar to map pixels → real feet.
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

// Pixels per foot — default scale: 20px = 1ft
const PX_PER_FOOT = 20;

function formatLength(px: number): string {
  const feet = px / PX_PER_FOOT;
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
  } = useDrawingStore();

  const stageRef = useRef<Konva.Stage>(null);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null);
  const [floorPlanImg, setFloorPlanImg] = useState<HTMLImageElement | null>(null);

  // Load floor plan image
  useEffect(() => {
    if (!floorPlanUrl) {
      setFloorPlanImg(null);
      return;
    }
    const img = new window.Image();
    img.src = floorPlanUrl;
    img.onload = () => setFloorPlanImg(img);
  }, [floorPlanUrl]);

  // Convert stage pointer position to canvas coordinates (accounting for viewport)
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
      // 1. Snap to wall endpoints
      const wallSnap = snapToWalls(raw, walls, viewport.scale);
      if (wallSnap.snapped) return wallSnap;

      // 2. Snap to grid
      let pt = snapToGrid(raw);

      // 3. Snap to 45° angle from drawing start
      if (shiftHeld && drawingStart) {
        pt = snapToAngle(drawingStart, pt);
      } else if (drawingStart) {
        // Orthogonal snap when not shift-held
        const dx = Math.abs(pt.x - drawingStart.x);
        const dy = Math.abs(pt.y - drawingStart.y);
        if (dx > dy) {
          pt = { x: pt.x, y: drawingStart.y };
        } else {
          pt = { x: drawingStart.x, y: pt.y };
        }
      }

      return { point: pt, snapped: false };
    },
    [walls, viewport.scale, drawingStart]
  );

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
        // Finish wall
        const len = wallLength({ start: drawingStart, end: point });
        if (len > 5) {
          addWall({
            start: drawingStart,
            end: point,
            height: defaultWallHeight,
          });
        }
        // Chain: start next wall from this endpoint
        setDrawingStart(point);
      }
    },
    [activeTool, stageToCanvas, resolvePoint, drawingStart, setDrawingStart, addWall, defaultWallHeight]
  );

  const handleDblClick = useCallback(() => {
    if (activeTool === "wall") {
      setDrawingStart(null);
    }
  }, [activeTool, setDrawingStart]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawingStart(null);
        setSelectedWallId(null);
      }
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

  // Zoom with wheel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const scaleBy = 1.08;
      const oldScale = viewport.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newScale =
        e.evt.deltaY < 0
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

  // Pan with middle mouse or when pan tool is active
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
      setViewport({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy,
      });
    },
    [viewport, setViewport]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Grid dots
  const gridDots = () => {
    const dots: React.ReactNode[] = [];
    // Compute visible canvas area
    const startX = Math.floor(-viewport.x / viewport.scale / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(-viewport.y / viewport.scale / GRID_SIZE) * GRID_SIZE;
    const endX = startX + width / viewport.scale + GRID_SIZE * 2;
    const endY = startY + height / viewport.scale + GRID_SIZE * 2;

    let key = 0;
    for (let x = startX; x < endX; x += GRID_SIZE) {
      for (let y = startY; y < endY; y += GRID_SIZE) {
        dots.push(
          <Circle
            key={key++}
            x={x}
            y={y}
            radius={1 / viewport.scale}
            fill="#CBD5E1"
            listening={false}
          />
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
        cursor:
          activeTool === "pan"
            ? "grab"
            : activeTool === "wall"
            ? "crosshair"
            : "default",
        background: "#F8FAFC",
      }}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleMouseMoveForPan(e);
      }}
      onClick={handleClick}
      onDblClick={handleDblClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Viewport transform layer */}
      <Layer x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
        {/* Grid */}
        {gridDots()}

        {/* Floor plan image */}
        {floorPlanImg && floorPlanSize && (
          <KonvaImage
            image={floorPlanImg}
            x={0}
            y={0}
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
            onClick={() => {
              if (activeTool === "select") {
                setSelectedWallId(wall.id === selectedWallId ? null : wall.id);
              }
            }}
          />
        ))}

        {/* Preview wall while drawing */}
        {activeTool === "wall" && drawingStart && cursorPos && (
          <Group>
            <Line
              points={[
                drawingStart.x,
                drawingStart.y,
                cursorPos.x,
                cursorPos.y,
              ]}
              stroke={previewColor}
              strokeWidth={wallThickness / viewport.scale}
              dash={[8 / viewport.scale, 4 / viewport.scale]}
              listening={false}
            />
            {/* Start endpoint */}
            <Circle
              x={drawingStart.x}
              y={drawingStart.y}
              radius={5 / viewport.scale}
              fill={previewColor}
              listening={false}
            />
            {/* End endpoint */}
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={5 / viewport.scale}
              fill={previewColor}
              listening={false}
            />
            {/* Dimension label */}
            <DimensionLabel
              start={drawingStart}
              end={cursorPos}
              scale={viewport.scale}
              color={previewColor}
            />
          </Group>
        )}

        {/* Snap indicator */}
        {snapIndicator && (
          <Circle
            x={snapIndicator.x}
            y={snapIndicator.y}
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
  onClick: () => void;
}

function WallSegment({ wall, selected, color, thickness, scale, onClick }: WallSegmentProps) {
  const mid = wallMidpoint(wall);
  const len = wallLength(wall);

  return (
    <Group onClick={onClick}>
      {/* Hit area (wider invisible line) */}
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke="transparent"
        strokeWidth={20 / scale}
        hitStrokeWidth={20 / scale}
      />
      {/* Visible wall */}
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke={color}
        strokeWidth={thickness / scale}
        lineCap="round"
        listening={false}
      />
      {/* Endpoints */}
      <Circle
        x={wall.start.x}
        y={wall.start.y}
        radius={selected ? 6 / scale : 4 / scale}
        fill={selected ? color : "#fff"}
        stroke={color}
        strokeWidth={2 / scale}
        listening={false}
      />
      <Circle
        x={wall.end.x}
        y={wall.end.y}
        radius={selected ? 6 / scale : 4 / scale}
        fill={selected ? color : "#fff"}
        stroke={color}
        strokeWidth={2 / scale}
        listening={false}
      />
      {/* Dimension label — always visible */}
      <DimensionLabel start={wall.start} end={wall.end} scale={scale} color={color} />
    </Group>
  );
}

interface DimensionLabelProps {
  start: Point;
  end: Point;
  scale: number;
  color: string;
}

function DimensionLabel({ start, end, scale, color }: DimensionLabelProps) {
  const mid = wallMidpoint({ start, end });
  const len = wallLength({ start, end });
  if (len < 10) return null;

  const label = formatLength(len);
  const fontSize = 11 / scale;
  const padding = 3 / scale;
  const bgWidth = label.length * fontSize * 0.6 + padding * 2;
  const bgHeight = fontSize + padding * 2;

  // Angle of wall
  const angle =
    (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  const normalAngle = angle > 90 || angle < -90 ? angle + 180 : angle;

  // Offset perpendicular to wall
  const rad = Math.atan2(end.y - start.y, end.x - start.x);
  const perpX = -Math.sin(rad) * (14 / scale);
  const perpY = Math.cos(rad) * (14 / scale);

  return (
    <Group
      x={mid.x + perpX}
      y={mid.y + perpY}
      rotation={normalAngle}
      listening={false}
    >
      <Rect
        x={-bgWidth / 2}
        y={-bgHeight / 2}
        width={bgWidth}
        height={bgHeight}
        fill="white"
        stroke={color}
        strokeWidth={0.8 / scale}
        cornerRadius={2 / scale}
        opacity={0.92}
      />
      <Text
        text={label}
        fontSize={fontSize}
        fontFamily="'IBM Plex Mono', monospace"
        fill={color}
        align="center"
        x={-bgWidth / 2}
        y={-bgHeight / 2 + padding * 0.5}
        width={bgWidth}
      />
    </Group>
  );
}
