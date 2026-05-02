/**
 * Scale Calibration Tool
 * 1. User clicks "Calibrate Scale" in the toolbar
 * 2. They click two points on the canvas (known distance apart)
 * 3. A dialog asks for the real-world distance in feet
 * 4. pxPerFoot is updated = pixel distance / real feet
 *
 * The calibration state lives here as local state; only pxPerFoot is stored globally.
 */
import { useState, useCallback } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import type { Point } from "@/store/useDrawingStore";
import { wallLength } from "@/lib/snap";
import { Ruler, X, Check } from "lucide-react";

export type CalibrationState = "idle" | "picking-first" | "picking-second" | "dialog";

interface CalibrationPoint {
  canvas: Point;
}

interface Props {
  calibrationState: CalibrationState;
  setCalibrationState: (s: CalibrationState) => void;
  firstPoint: CalibrationPoint | null;
  setFirstPoint: (p: CalibrationPoint | null) => void;
  secondPoint: CalibrationPoint | null;
  setSecondPoint: (p: CalibrationPoint | null) => void;
}

export default function ScaleCalibratorDialog({
  calibrationState,
  setCalibrationState,
  firstPoint,
  secondPoint,
  setFirstPoint,
  setSecondPoint,
}: Props) {
  const { setPxPerFoot, pxPerFoot } = useDrawingStore();
  const [inputFeet, setInputFeet] = useState("");
  const [error, setError] = useState("");

  const cancel = useCallback(() => {
    setCalibrationState("idle");
    setFirstPoint(null);
    setSecondPoint(null);
    setInputFeet("");
    setError("");
  }, [setCalibrationState, setFirstPoint, setSecondPoint]);

  const confirm = useCallback(() => {
    if (!firstPoint || !secondPoint) return;
    const feet = parseFloat(inputFeet);
    if (!feet || feet <= 0) { setError("Enter a valid distance in feet."); return; }
    const pixelDist = wallLength({ start: firstPoint.canvas, end: secondPoint.canvas });
    if (pixelDist < 5) { setError("Points are too close together."); return; }
    const newPxPerFoot = pixelDist / feet;
    setPxPerFoot(newPxPerFoot);
    cancel();
  }, [firstPoint, secondPoint, inputFeet, setPxPerFoot, cancel]);

  if (calibrationState !== "dialog") return null;

  const pixelDist = firstPoint && secondPoint
    ? wallLength({ start: firstPoint.canvas, end: secondPoint.canvas })
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-80 p-5 mx-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Ruler size={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Set Scale</h3>
            <p className="text-xs text-slate-500">Enter the real-world distance between your two points</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Pixel distance</span>
            <span className="font-mono font-medium">{Math.round(pixelDist)} px</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Current scale</span>
            <span className="font-mono font-medium">{pxPerFoot.toFixed(1)} px/ft</span>
          </div>
        </div>

        <label className="text-xs font-medium text-slate-600 block mb-1">
          Real distance (feet)
        </label>
        <input
          type="number"
          min={0.1}
          step={0.5}
          value={inputFeet}
          onChange={(e) => { setInputFeet(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") cancel(); }}
          placeholder="e.g. 10"
          autoFocus
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
        />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <div className="flex gap-2 mt-3">
          <button
            onClick={cancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X size={13} /> Cancel
          </button>
          <button
            onClick={confirm}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Check size={13} /> Apply
          </button>
        </div>
      </div>
    </div>
  );
}
