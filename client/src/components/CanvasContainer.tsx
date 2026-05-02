/**
 * Design: Clean Construction App
 * Measures available space and passes exact pixel dimensions to DrawingCanvas.
 * Also handles scale calibration point picking by intercepting canvas clicks.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import DrawingCanvas from "./DrawingCanvas";
import { useDrawingStore } from "@/store/useDrawingStore";
import type { CalibrationState } from "./ScaleCalibrator";
import type { Point } from "@/store/useDrawingStore";

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
  const { viewport } = useDrawingStore();

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
      // Convert to canvas coordinates
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

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      <DrawingCanvas width={size.width} height={size.height} />

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
