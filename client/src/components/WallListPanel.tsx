/**
 * Design: Clean Construction App
 * Compact wall list panel — used in the mobile bottom drawer.
 * On desktop the right column shows EstimatePanel + this as a tab.
 */
import { useDrawingStore } from "@/store/useDrawingStore";
import { wallLength } from "@/lib/snap";
import { Trash2, Layers } from "lucide-react";

export default function WallListPanel() {
  const {
    walls,
    selectedWallId,
    setSelectedWallId,
    deleteWall,
    updateWall,
    defaultWallHeight,
    setDefaultWallHeight,
    pxPerFoot,
  } = useDrawingStore();

  function formatLength(px: number): string {
    const feet = px / pxPerFoot;
    const wholeFeet = Math.floor(feet);
    const inches = Math.round((feet - wholeFeet) * 12);
    if (inches === 0) return `${wholeFeet}' 0"`;
    if (inches === 12) return `${wholeFeet + 1}' 0"`;
    return `${wholeFeet}' ${inches}"`;
  }

  const selectedWall = walls.find((w) => w.id === selectedWallId);

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Default height */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0">
        <label className="text-xs text-slate-500 font-medium block mb-1">
          Default Wall Height (ft)
        </label>
        <input
          type="number"
          min={6}
          max={20}
          step={0.5}
          value={defaultWallHeight}
          onChange={(e) => setDefaultWallHeight(parseFloat(e.target.value) || 9)}
          className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Selected wall detail */}
      {selectedWall && (
        <div className="px-4 py-3 border-b border-orange-100 bg-orange-50 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-orange-700">Selected Wall</span>
            <button
              onClick={() => { deleteWall(selectedWall.id); setSelectedWallId(null); }}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Length</span>
              <span className="font-mono font-medium">{formatLength(wallLength(selectedWall))}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Height (ft)</span>
              <input
                type="number" min={6} max={20} step={0.5}
                value={selectedWall.height}
                onChange={(e) => updateWall(selectedWall.id, { height: parseFloat(e.target.value) || defaultWallHeight })}
                className="w-16 text-right text-xs border border-orange-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Wall list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {walls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-xs text-center px-4">
            <Layers size={20} className="mb-1 opacity-40" />
            <p>No walls yet. Draw on the canvas to start.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {walls.map((wall, i) => {
              const isSelected = wall.id === selectedWallId;
              return (
                <li
                  key={wall.id}
                  onClick={() => setSelectedWallId(isSelected ? null : wall.id)}
                  className={`px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors ${
                    isSelected ? "bg-orange-50 border-l-2 border-orange-500" : "hover:bg-slate-50 border-l-2 border-transparent"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-orange-500" : "bg-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700">Wall {i + 1}</div>
                    <div className="text-xs text-slate-400 font-mono">{formatLength(wallLength(wall))} × {wall.height}'</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWall(wall.id); if (isSelected) setSelectedWallId(null); }}
                    className="text-slate-300 hover:text-red-400 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
