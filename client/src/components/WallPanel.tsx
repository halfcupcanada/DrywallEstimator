/**
 * Design: Clean Construction App
 * Right panel — wall list, selected wall details, default height setting
 */
import { useDrawingStore } from "@/store/useDrawingStore";
import { wallLength } from "@/lib/snap";
import { Trash2, Layers } from "lucide-react";

const PX_PER_FOOT = 20;

function formatLength(px: number): string {
  const feet = px / PX_PER_FOOT;
  const wholeFeet = Math.floor(feet);
  const inches = Math.round((feet - wholeFeet) * 12);
  if (inches === 0) return `${wholeFeet}' 0"`;
  if (inches === 12) return `${wholeFeet + 1}' 0"`;
  return `${wholeFeet}' ${inches}"`;
}

export default function WallPanel() {
  const {
    walls,
    selectedWallId,
    setSelectedWallId,
    deleteWall,
    updateWall,
    defaultWallHeight,
    setDefaultWallHeight,
  } = useDrawingStore();

  const selectedWall = walls.find((w) => w.id === selectedWallId);

  const totalWallArea = walls.reduce((sum, w) => {
    const len = wallLength(w) / PX_PER_FOOT;
    return sum + len * w.height;
  }, 0);

  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Walls</span>
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {walls.length}
          </span>
        </div>
      </div>

      {/* Default height */}
      <div className="px-4 py-3 border-b border-slate-100">
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
          className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Selected wall detail */}
      {selectedWall && (
        <div className="px-4 py-3 border-b border-orange-100 bg-orange-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-orange-700">Selected Wall</span>
            <button
              onClick={() => {
                deleteWall(selectedWall.id);
                setSelectedWallId(null);
              }}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Length</span>
              <span className="font-mono font-medium text-slate-800">
                {formatLength(wallLength(selectedWall))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Height</span>
              <input
                type="number"
                min={6}
                max={20}
                step={0.5}
                value={selectedWall.height}
                onChange={(e) =>
                  updateWall(selectedWall.id, {
                    height: parseFloat(e.target.value) || defaultWallHeight,
                  })
                }
                className="w-16 text-right text-xs border border-orange-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
              />
            </div>
            <div className="flex justify-between">
              <span>Area</span>
              <span className="font-mono font-medium text-slate-800">
                {(wallLength(selectedWall) / PX_PER_FOOT * selectedWall.height).toFixed(1)} ft²
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Wall list */}
      <div className="flex-1 overflow-y-auto">
        {walls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs text-center px-4">
            <Layers size={24} className="mb-2 opacity-40" />
            <p>No walls yet.</p>
            <p className="mt-1">Select the Draw Wall tool and click on the canvas to start.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {walls.map((wall, i) => {
              const len = wallLength(wall);
              const isSelected = wall.id === selectedWallId;
              return (
                <li
                  key={wall.id}
                  onClick={() =>
                    setSelectedWallId(isSelected ? null : wall.id)
                  }
                  className={`
                    px-4 py-2.5 cursor-pointer flex items-center gap-3 transition-colors
                    ${isSelected ? "bg-orange-50 border-l-2 border-orange-500" : "hover:bg-slate-50 border-l-2 border-transparent"}
                  `}
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-orange-500" : "bg-blue-500"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700">
                      Wall {i + 1}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {formatLength(len)} × {wall.height}'
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWall(wall.id);
                      if (isSelected) setSelectedWallId(null);
                    }}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Summary */}
      {walls.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Total Wall Area</span>
              <span className="font-mono font-semibold text-slate-700">
                {totalWallArea.toFixed(1)} ft²
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
