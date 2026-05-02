/**
 * Design: Clean Construction App
 * Measures available space and passes exact pixel dimensions to DrawingCanvas.
 * Also handles scale calibration point picking and shows a floating delete button
 * above the midpoint of the selected wall.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import DrawingCanvas from "./DrawingCanvas";
import { useDrawingStore } from "@/store/useDrawingStore";
import type { CalibrationState } from "./ScaleCalibrator";
import type { Point } from "@/store/useDrawingStore";
import { Trash2 } from "lucide-react";

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
  } = useDrawingStore();

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

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      <DrawingCanvas width={size.width} height={size.height} />

      {/* Floating delete button for selected wall */}
      {deleteButtonPos && selectedWall && !isCalibrating && (
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
    </div>
  );
}
