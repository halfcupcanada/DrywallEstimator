/**
 * Design: Clean Construction App
 * Measures available space and passes exact pixel dimensions to DrawingCanvas.
 * Handles:
 * - Scale calibration point picking
 * - Floating delete button for selected wall
 * - Opening tool: click a wall to place a door/window
 * - Opening markers rendered as HTML overlays
 */
import { useEffect, useRef, useState, useCallback } from "react";
import DrawingCanvas from "./DrawingCanvas";
import { useDrawingStore } from "@/store/useDrawingStore";
import type { CalibrationState } from "./ScaleCalibrator";
import type { Point, Wall } from "@/store/useDrawingStore";
import { Trash2, DoorOpen, AppWindow, X } from "lucide-react";
import RoomSummaryOverlay from "./RoomSummaryOverlay";
import OpeningDialog from "./OpeningDialog";
import { wallLength } from "@/lib/snap";

interface Props {
  calibrationState: CalibrationState;
  setCalibrationState: (s: CalibrationState) => void;
  calFirstPoint: { canvas: Point } | null;
  setCalFirstPoint: (p: { canvas: Point } | null) => void;
  calSecondPoint: { canvas: Point } | null;
  setCalSecondPoint: (p: { canvas: Point } | null) => void;
}

export default function CanvasContainer({
  calibrationState,
  setCalibrationState,
  calFirstPoint,
  setCalFirstPoint,
  setCalSecondPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const {
    viewport,
    selectedWallId,
    walls,
    deleteWall,
    setSelectedWallId,
    activeTool,
    openings,
    addOpening,
    deleteOpening,
    pxPerFoot,
  } = useDrawingStore();

  // Opening dialog state
  const [pendingOpening, setPendingOpening] = useState<{
    wallId: string;
    t: number;
    wallLengthFt: number;
    wallHeightFt: number;
  } | null>(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Handle calibration clicks on the canvas overlay
  const handleCalibrationClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (calibrationState !== "picking-first" && calibrationState !== "picking-second") return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const stageX = e.clientX - rect.left;
      const stageY = e.clientY - rect.top;
      const canvasPoint: Point = {
        x: (stageX - viewport.x) / viewport.scale,
        y: (stageY - viewport.y) / viewport.scale,
      };
      if (calibrationState === "picking-first") {
        setCalFirstPoint({ canvas: canvasPoint });
        setCalibrationState("picking-second");
      } else if (calibrationState === "picking-second") {
        setCalSecondPoint({ canvas: canvasPoint });
        setCalibrationState("dialog");
      }
    },
    [calibrationState, viewport, setCalFirstPoint, setCalSecondPoint, setCalibrationState]
  );

  // Handle opening tool: find which wall was clicked and compute t position
  const handleOpeningClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== "opening") return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const stageX = e.clientX - rect.left;
      const stageY = e.clientY - rect.top;
      const cx = (stageX - viewport.x) / viewport.scale;
      const cy = (stageY - viewport.y) / viewport.scale;

      // Find the closest wall within a threshold
      const HIT_THRESHOLD = 16 / viewport.scale;
      let bestWall: Wall | null = null;
      let bestT = 0;
      let bestDist = Infinity;

      for (const wall of walls) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1) continue;
        const t = Math.max(0, Math.min(1, ((cx - wall.start.x) * dx + (cy - wall.start.y) * dy) / lenSq));
        const px = wall.start.x + t * dx - cx;
        const py = wall.start.y + t * dy - cy;
        const dist = Math.sqrt(px * px + py * py);
        if (dist < HIT_THRESHOLD && dist < bestDist) {
          bestDist = dist;
          bestWall = wall;
          bestT = t;
        }
      }

      if (bestWall) {
        const lenFt = wallLength(bestWall) / pxPerFoot;
        setPendingOpening({
          wallId: bestWall.id,
          t: bestT,
          wallLengthFt: lenFt,
          wallHeightFt: bestWall.height,
        });
      }
    },
    [activeTool, viewport, walls, pxPerFoot]
  );

  const isCalibrating = calibrationState === "picking-first" || calibrationState === "picking-second";

  // Compute screen-space midpoint of the selected wall for the floating delete button
  const selectedWall = walls.find((w) => w.id === selectedWallId);
  const deleteButtonPos = selectedWall
    ? {
        x: ((selectedWall.start.x + selectedWall.end.x) / 2) * viewport.scale + viewport.x,
        y: ((selectedWall.start.y + selectedWall.end.y) / 2) * viewport.scale + viewport.y,
      }
    : null;

  const handleDelete = () => {
    if (!selectedWallId) return;
    deleteWall(selectedWallId);
    setSelectedWallId(null);
  };

  // Compute screen position for an opening marker
  const openingScreenPos = (wallId: string, t: number) => {
    const wall = walls.find((w) => w.id === wallId);
    if (!wall) return null;
    const cx = wall.start.x + t * (wall.end.x - wall.start.x);
    const cy = wall.start.y + t * (wall.end.y - wall.start.y);
    return {
      x: cx * viewport.scale + viewport.x,
      y: cy * viewport.scale + viewport.y,
    };
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      <DrawingCanvas width={size.width} height={size.height} />

      {/* Opening tool click overlay */}
      {activeTool === "opening" && !isCalibrating && (
        <div
          onClick={handleOpeningClick}
          style={{
            position: "absolute",
            inset: 0,
            cursor: "cell",
            zIndex: 10,
          }}
        />
      )}

      {/* Floating delete button for selected wall */}
      {deleteButtonPos && selectedWall && !isCalibrating && activeTool !== "opening" && (
        <div
          style={{
            position: "absolute",
            left: deleteButtonPos.x,
            top: Math.max(deleteButtonPos.y - 40, 8),
            transform: "translateX(-50%)",
            zIndex: 20,
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-red-500/40 transition-all active:scale-95 select-none"
            style={{ whiteSpace: "nowrap" }}
          >
            <Trash2 size={13} />
            Delete Wall
          </button>
        </div>
      )}

      {/* Opening markers */}
      {openings.map((opening) => {
        const pos = openingScreenPos(opening.wallId, opening.t);
        if (!pos) return null;
        const Icon = opening.type === "door" ? DoorOpen : AppWindow;
        return (
          <div
            key={opening.id}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -50%)",
              zIndex: 15,
              pointerEvents: "auto",
            }}
          >
            <div className="group relative">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 ${
                opening.type === "door"
                  ? "bg-amber-500 border-amber-600 text-white"
                  : "bg-sky-500 border-sky-600 text-white"
              }`}>
                <Icon size={13} />
              </div>
              {/* Delete button on hover */}
              <button
                onClick={() => deleteOpening(opening.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center shadow"
              >
                <X size={9} />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {opening.type === "door" ? "Door" : "Window"} {opening.widthFt}×{opening.heightFt} ft
              </div>
            </div>
          </div>
        );
      })}

      {/* Room summary overlay */}
      <RoomSummaryOverlay />

      {/* Calibration click overlay */}
      {isCalibrating && (
        <div
          onClick={handleCalibrationClick}
          style={{
            position: "absolute",
            inset: 0,
            cursor: "crosshair",
            zIndex: 10,
          }}
        />
      )}

      {/* Calibration first point marker */}
      {calFirstPoint && isCalibrating && (
        <div
          style={{
            position: "absolute",
            left: calFirstPoint.canvas.x * viewport.scale + viewport.x - 6,
            top: calFirstPoint.canvas.y * viewport.scale + viewport.y - 6,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#F59E0B",
            border: "2px solid white",
            boxShadow: "0 0 0 2px #F59E0B",
            pointerEvents: "none",
            zIndex: 11,
          }}
        />
      )}

      {/* Opening dialog */}
      {pendingOpening && (
        <OpeningDialog
          wallId={pendingOpening.wallId}
          wallLengthFt={pendingOpening.wallLengthFt}
          wallHeightFt={pendingOpening.wallHeightFt}
          t={pendingOpening.t}
          onConfirm={(data) => {
            addOpening({
              wallId: pendingOpening.wallId,
              t: data.t,
              type: data.type,
              widthFt: data.widthFt,
              heightFt: data.heightFt,
              sillFt: data.sillFt,
            });
            setPendingOpening(null);
          }}
          onCancel={() => setPendingOpening(null)}
        />
      )}
    </div>
  );
}
