/**
 * Design: Clean Construction App
 * Right panel — real-time drywall estimate with sheet config controls.
 * Replaces the old WallPanel on desktop; shown in the right column.
 */
import { useMemo } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import { calculateEstimate, type SheetSize } from "@/lib/estimate";
import { wallLength } from "@/lib/snap";
import {
  Layers,
  Package,
  Wrench,
  Droplets,
  Ruler,
  ChevronDown,
  Lightbulb,
} from "lucide-react";

export default function EstimatePanel() {
  const {
    walls,
    pxPerFoot,
    sheetSize,
    setSheetSize,
    wasteFactor,
    setWasteFactor,
    includeCeiling,
    setIncludeCeiling,
    defaultWallHeight,
  } = useDrawingStore();

  const totalWallArea = useMemo(() => {
    return walls.reduce((sum, w) => {
      const lenFt = wallLength(w) / pxPerFoot;
      return sum + lenFt * w.height;
    }, 0);
  }, [walls, pxPerFoot]);

  const estimate = useMemo(
    () =>
      calculateEstimate({
        totalWallArea,
        totalCeilingArea: 0, // ceiling area added in future room tool
        sheetSize,
        wasteFactor,
        includeCeiling,
      }),
    [totalWallArea, sheetSize, wasteFactor, includeCeiling]
  );

  const sheetOptions: SheetSize[] = ["4x8", "4x10", "4x12"];

  return (
    <aside className="w-full h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden text-sm">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-blue-600" />
          <span className="font-semibold text-slate-700">Estimate</span>
          {walls.length > 0 && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Live
            </span>
          )}
        </div>
      </div>

      {/* ── Config ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0 space-y-3">
        {/* Sheet size */}
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">
            Sheet Size
          </label>
          <div className="flex gap-1">
            {sheetOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSheetSize(s)}
                className={`flex-1 py-1 text-xs rounded border font-medium transition-all ${
                  sheetSize === s
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Waste factor */}
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">
            Waste Factor: <span className="text-slate-700 font-semibold">{Math.round(wasteFactor * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={0.3}
            step={0.01}
            value={wasteFactor}
            onChange={(e) => setWasteFactor(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0%</span><span>10%</span><span>20%</span><span>30%</span>
          </div>
        </div>

        {/* Include ceiling toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500 font-medium">Include Ceiling</label>
          <button
            onClick={() => setIncludeCeiling(!includeCeiling)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              includeCeiling ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                includeCeiling ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────────────── */}
      {walls.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs text-center px-4">
          <Package size={28} className="mb-2 opacity-30" />
          <p className="font-medium">No walls drawn yet</p>
          <p className="mt-1 text-slate-400">Draw walls on the canvas to see your material estimate.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Area summary */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Area</p>
            <Row icon={<Ruler size={13} className="text-slate-400" />} label="Wall Area" value={`${estimate.grossArea.toFixed(1)} ft²`} />
            <Row icon={<Ruler size={13} className="text-slate-400" />} label={`+${Math.round(wasteFactor * 100)}% Waste`} value={`${(estimate.adjustedArea - estimate.grossArea).toFixed(1)} ft²`} muted />
            <Row icon={<Ruler size={13} className="text-blue-500" />} label="Total (with waste)" value={`${estimate.adjustedArea.toFixed(1)} ft²`} bold />
          </div>

          {/* Sheets */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Drywall Sheets</p>
            <Row icon={<Package size={13} className="text-blue-500" />} label={`${sheetSize} sheets (${estimate.sheetArea} ft² ea)`} value={`${estimate.sheetsRequired} sheets`} bold />
            <div className="mt-2 grid grid-cols-3 gap-1">
              {(["4x8", "4x10", "4x12"] as SheetSize[]).map((s) => (
                <div
                  key={s}
                  className={`text-center py-1.5 rounded text-xs ${
                    s === estimate.bestSheetSize
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-slate-50 border border-slate-100 text-slate-500"
                  }`}
                >
                  <div className="font-semibold">{estimate.sheetsBySize[s]}</div>
                  <div className="text-[10px] opacity-70">{s}</div>
                  {s === estimate.bestSheetSize && (
                    <div className="text-[9px] text-green-600 font-medium">best</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fasteners & finishing */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Materials</p>
            <Row icon={<Wrench size={13} className="text-slate-400" />} label="Drywall Screws" value={`${estimate.screws.toLocaleString()} pcs`} />
            <Row icon={<Layers size={13} className="text-slate-400" />} label="Joint Tape" value={`${estimate.tapeRolls} roll${estimate.tapeRolls !== 1 ? "s" : ""} (${Math.round(estimate.tapeFt)} ft)`} />
            <Row icon={<Droplets size={13} className="text-slate-400" />} label="Joint Compound" value={`${estimate.mudBuckets} bucket${estimate.mudBuckets !== 1 ? "s" : ""} (${estimate.mudGallons.toFixed(1)} gal)`} />
          </div>

          {/* Best sheet tip */}
          {estimate.bestSheetSize !== sheetSize && (
            <div className="mx-4 my-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <Lightbulb size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Switch to <strong>{estimate.bestSheetSize}</strong> to use fewer sheets ({estimate.sheetsBySize[estimate.bestSheetSize]} vs {estimate.sheetsRequired}).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Wall count footer ───────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Layers size={12} />
          <span>{walls.length} wall{walls.length !== 1 ? "s" : ""}</span>
          <span className="text-slate-300">·</span>
          <span>Scale: {pxPerFoot} px/ft</span>
        </div>
      </div>
    </aside>
  );
}

function Row({
  icon,
  label,
  value,
  bold,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 py-0.5 ${muted ? "opacity-60" : ""}`}>
      <span className="shrink-0">{icon}</span>
      <span className={`flex-1 text-xs ${bold ? "text-slate-800 font-semibold" : "text-slate-600"}`}>{label}</span>
      <span className={`text-xs font-mono ${bold ? "text-slate-900 font-bold" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}
