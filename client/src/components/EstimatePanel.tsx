/**
 * Design: Clean Construction App
 * Right panel — real-time drywall estimate with sheet config controls.
 * Shows per-room breakdown when closed rooms are detected, plus grand total.
 */
import { useMemo, useState } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import { calculateEstimate, type SheetSize } from "@/lib/estimate";
import { wallLength } from "@/lib/snap";
import { detectRooms } from "@/lib/roomDetect";
import type { Opening } from "@/store/useDrawingStore";
import { generateEstimatePDF } from "@/lib/generateEstimatePDF";
import {
  Layers,
  Package,
  Wrench,
  Droplets,
  Ruler,
  Lightbulb,
  Home,
  ChevronDown,
  ChevronRight,
  Download,
  X,
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
    openings,
  } = useDrawingStore();

  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportProjectName, setExportProjectName] = useState("");

  const rooms = useMemo(() => detectRooms(walls, pxPerFoot), [walls, pxPerFoot]);

  // Total opening area deduction
  const totalOpeningArea = useMemo(() => {
    if (!openings) return 0;
    return openings.reduce((sum: number, o: Opening) => sum + o.widthFt * o.heightFt, 0);
  }, [openings]);

  // All-walls total (fallback when no closed rooms)
  const totalWallArea = useMemo(() => {
    return walls.reduce((sum, w) => {
      const lenFt = wallLength(w) / pxPerFoot;
      return sum + lenFt * w.height;
    }, 0);
  }, [walls, pxPerFoot]);

  // Grand total ceiling area from rooms
  const totalCeilingArea = useMemo(
    () => rooms.reduce((sum, r) => sum + r.floorAreaFt2, 0),
    [rooms]
  );

  // Grand total wall area from rooms (or all walls if no rooms)
  const grandWallArea = rooms.length > 0
    ? rooms.reduce((sum, r) => sum + r.wallAreaFt2, 0)
    : totalWallArea;

  const grandWallAreaNet = Math.max(0, grandWallArea - totalOpeningArea);

  const grandEstimate = useMemo(
    () =>
      calculateEstimate({
        totalWallArea: grandWallAreaNet,
        totalCeilingArea,
        sheetSize,
        wasteFactor,
        includeCeiling,
      }),
    [grandWallAreaNet, totalCeilingArea, sheetSize, wasteFactor, includeCeiling]
  );

  const sheetOptions: SheetSize[] = ["4x8", "4x10", "4x12"];

  const toggleRoom = (i: number) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

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
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Sheet Size</label>
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

        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">
            Waste Factor: <span className="text-slate-700 font-semibold">{Math.round(wasteFactor * 100)}%</span>
          </label>
          <input
            type="range" min={0} max={0.3} step={0.01} value={wasteFactor}
            onChange={(e) => setWasteFactor(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0%</span><span>10%</span><span>20%</span><span>30%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500 font-medium">Include Ceiling</label>
          <button
            onClick={() => setIncludeCeiling(!includeCeiling)}
            className={`relative w-9 h-5 rounded-full transition-colors ${includeCeiling ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeCeiling ? "translate-x-4" : "translate-x-0.5"}`} />
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

          {/* ── Per-room breakdown (when rooms detected) ── */}
          {rooms.length > 0 && (
            <div className="border-b border-slate-100">
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  {rooms.length} Room{rooms.length !== 1 ? "s" : ""} Detected
                </p>
              </div>
              {rooms.map((room, i) => {
                const roomEst = calculateEstimate({
                  totalWallArea: room.wallAreaFt2,
                  totalCeilingArea: room.floorAreaFt2,
                  sheetSize,
                  wasteFactor,
                  includeCeiling,
                });
                const expanded = expandedRooms.has(i);
                return (
                  <div key={i} className="border-b border-slate-100 last:border-0">
                    <button
                      onClick={() => toggleRoom(i)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      {expanded ? <ChevronDown size={13} className="text-slate-400 shrink-0" /> : <ChevronRight size={13} className="text-slate-400 shrink-0" />}
                      <Home size={13} className="text-blue-500 shrink-0" />
                      <span className="text-xs font-medium text-slate-700 flex-1">Room {i + 1}</span>
                      <span className="text-xs font-mono text-slate-500">{room.wallIds.length} walls</span>
                      <span className="text-xs font-mono font-semibold text-blue-600 ml-2">{roomEst.sheetsRequired} sh</span>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-3 bg-slate-50 space-y-0.5">
                        <Row icon={<Ruler size={12} />} label="Perimeter" value={`${room.perimeterFt.toFixed(1)} ft`} />
                        <Row icon={<Ruler size={12} />} label="Floor Area" value={`${room.floorAreaFt2.toFixed(1)} ft²`} />
                        <Row icon={<Layers size={12} />} label="Wall Area" value={`${room.wallAreaFt2.toFixed(1)} ft²`} />
                        <Row icon={<Package size={12} className="text-blue-500" />} label={`${sheetSize} Sheets`} value={`${roomEst.sheetsRequired}`} bold />
                        <Row icon={<Wrench size={12} />} label="Screws" value={`${roomEst.screws}`} />
                        <Row icon={<Droplets size={12} />} label="Mud" value={`${roomEst.mudBuckets} bucket${roomEst.mudBuckets !== 1 ? "s" : ""}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Grand total area ── */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {rooms.length > 0 ? "Grand Total" : "Area"}
            </p>
            <Row icon={<Ruler size={13} className="text-slate-400" />} label="Wall Area" value={`${grandWallArea.toFixed(1)} ft²`} />
            {totalOpeningArea > 0 && (
              <Row icon={<Ruler size={13} className="text-red-400" />} label="Openings Deduction" value={`−${totalOpeningArea.toFixed(1)} ft²`} muted />
            )}
            {includeCeiling && rooms.length > 0 && (
              <Row icon={<Ruler size={13} className="text-slate-400" />} label="Ceiling Area" value={`${totalCeilingArea.toFixed(1)} ft²`} />
            )}
            <Row icon={<Ruler size={13} className="text-slate-400" />} label={`+${Math.round(wasteFactor * 100)}% Waste`} value={`${(grandEstimate.adjustedArea - grandEstimate.grossArea).toFixed(1)} ft²`} muted />
            <Row icon={<Ruler size={13} className="text-blue-500" />} label="Total (with waste)" value={`${grandEstimate.adjustedArea.toFixed(1)} ft²`} bold />
          </div>

          {/* ── Sheets ── */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Drywall Sheets</p>
            <Row icon={<Package size={13} className="text-blue-500" />} label={`${sheetSize} (${grandEstimate.sheetArea} ft² ea)`} value={`${grandEstimate.sheetsRequired} sheets`} bold />
            <div className="mt-2 grid grid-cols-3 gap-1">
              {(["4x8", "4x10", "4x12"] as SheetSize[]).map((s) => (
                <div
                  key={s}
                  className={`text-center py-1.5 rounded text-xs ${
                    s === grandEstimate.bestSheetSize
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-slate-50 border border-slate-100 text-slate-500"
                  }`}
                >
                  <div className="font-semibold">{grandEstimate.sheetsBySize[s]}</div>
                  <div className="text-[10px] opacity-70">{s}</div>
                  {s === grandEstimate.bestSheetSize && (
                    <div className="text-[9px] text-green-600 font-medium">best</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Materials ── */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Materials</p>
            <Row icon={<Wrench size={13} className="text-slate-400" />} label="Drywall Screws" value={`${grandEstimate.screws.toLocaleString()} pcs`} />
            <Row icon={<Layers size={13} className="text-slate-400" />} label="Joint Tape" value={`${grandEstimate.tapeRolls} roll${grandEstimate.tapeRolls !== 1 ? "s" : ""} (${Math.round(grandEstimate.tapeFt)} ft)`} />
            <Row icon={<Droplets size={13} className="text-slate-400" />} label="Joint Compound" value={`${grandEstimate.mudBuckets} bucket${grandEstimate.mudBuckets !== 1 ? "s" : ""} (${grandEstimate.mudGallons.toFixed(1)} gal)`} />
          </div>

          {/* ── Best sheet tip ── */}
          {grandEstimate.bestSheetSize !== sheetSize && (
            <div className="mx-4 my-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <Lightbulb size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Switch to <strong>{grandEstimate.bestSheetSize}</strong> to use fewer sheets ({grandEstimate.sheetsBySize[grandEstimate.bestSheetSize]} vs {grandEstimate.sheetsRequired}).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0 space-y-2">
        {walls.length > 0 && (
          <button
            onClick={() => setShowExportDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors"
          >
            <Download size={13} />
            Download PDF Report
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Layers size={12} />
          <span>{walls.length} wall{walls.length !== 1 ? "s" : ""}</span>
          {rooms.length > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span>{rooms.length} room{rooms.length !== 1 ? "s" : ""}</span>
            </>
          )}
          <span className="text-slate-300">·</span>
          <span>Scale: {pxPerFoot} px/ft</span>
        </div>
      </div>

      {/* ── Export dialog ── */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Download Estimate PDF</h3>
              <button onClick={() => setShowExportDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Project Name</label>
            <input
              type="text"
              value={exportProjectName}
              onChange={(e) => setExportProjectName(e.target.value)}
              placeholder="e.g. 123 Main St — Master Bedroom"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  generateEstimatePDF({
                    projectName: exportProjectName || "Untitled Project",
                    sheetSize,
                    wasteFactor,
                    defaultWallHeight: 9,
                    walls,
                    openings: openings ?? [],
                    pxPerFoot,
                  });
                  setShowExportDialog(false);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportDialog(false)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  generateEstimatePDF({
                    projectName: exportProjectName || "Untitled Project",
                    sheetSize,
                    wasteFactor,
                    defaultWallHeight: 9,
                    walls,
                    openings: openings ?? [],
                    pxPerFoot,
                  });
                  setShowExportDialog(false);
                }}
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
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
