/**
 * Design: Clean Construction App
 * Dialog that appears when user clicks a wall in "opening" tool mode.
 * Lets them choose door or window, set width/height, and confirm.
 */
import { useState } from "react";
import { DoorOpen, AppWindow, X, Check } from "lucide-react";
import type { OpeningType } from "@/store/useDrawingStore";

interface Props {
  wallId: string;
  wallLengthFt: number;
  wallHeightFt: number;
  t: number; // 0–1 position along wall
  onConfirm: (data: {
    type: OpeningType;
    widthFt: number;
    heightFt: number;
    sillFt: number;
    t: number;
  }) => void;
  onCancel: () => void;
}

const PRESETS: Record<OpeningType, { widthFt: number; heightFt: number; sillFt: number }> = {
  door: { widthFt: 3, heightFt: 7, sillFt: 0 },
  window: { widthFt: 3, heightFt: 4, sillFt: 2.5 },
};

export default function OpeningDialog({ wallLengthFt, wallHeightFt, t, onConfirm, onCancel }: Props) {
  const [type, setType] = useState<OpeningType>("door");
  const [widthFt, setWidthFt] = useState(PRESETS.door.widthFt);
  const [heightFt, setHeightFt] = useState(PRESETS.door.heightFt);
  const [sillFt, setSillFt] = useState(PRESETS.door.sillFt);

  const handleTypeChange = (t: OpeningType) => {
    setType(t);
    setWidthFt(PRESETS[t].widthFt);
    setHeightFt(PRESETS[t].heightFt);
    setSillFt(PRESETS[t].sillFt);
  };

  const maxWidth = Math.max(0.5, wallLengthFt - 0.5);
  const maxHeight = Math.max(0.5, wallHeightFt - sillFt - 0.1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700 text-white">
          <span className="font-semibold text-sm">Add Opening</span>
          <button onClick={onCancel} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-600 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["door", "window"] as OpeningType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    type === t
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-blue-300"
                  }`}
                >
                  {t === "door" ? <DoorOpen size={15} /> : <AppWindow size={15} />}
                  {t === "door" ? "Door" : "Window"}
                </button>
              ))}
            </div>
          </div>

          {/* Width */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">
              Width: <span className="text-slate-700 font-semibold">{widthFt.toFixed(1)} ft</span>
            </label>
            <input
              type="range" min={0.5} max={maxWidth} step={0.5} value={widthFt}
              onChange={(e) => setWidthFt(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0.5 ft</span><span>{maxWidth.toFixed(1)} ft</span>
            </div>
          </div>

          {/* Height */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">
              Height: <span className="text-slate-700 font-semibold">{heightFt.toFixed(1)} ft</span>
            </label>
            <input
              type="range" min={0.5} max={maxHeight} step={0.5} value={Math.min(heightFt, maxHeight)}
              onChange={(e) => setHeightFt(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0.5 ft</span><span>{maxHeight.toFixed(1)} ft</span>
            </div>
          </div>

          {/* Sill height (windows only) */}
          {type === "window" && (
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">
                Sill Height: <span className="text-slate-700 font-semibold">{sillFt.toFixed(1)} ft</span>
              </label>
              <input
                type="range" min={0} max={Math.max(0, wallHeightFt - heightFt - 0.1)} step={0.5} value={sillFt}
                onChange={(e) => setSillFt(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          )}

          {/* Area preview */}
          <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 flex items-center justify-between">
            <span>Opening area</span>
            <span className="font-mono font-semibold text-red-600">−{(widthFt * heightFt).toFixed(1)} ft²</span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ type, widthFt, heightFt, sillFt, t })}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
