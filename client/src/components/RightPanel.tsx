/**
 * Design: Clean Construction App
 * Desktop right panel with two tabs: Estimate | Walls
 * Auto-switches to Walls tab when a wall is selected on the canvas.
 */
import { useEffect, useState } from "react";
import EstimatePanel from "./EstimatePanel";
import WallListPanel from "./WallListPanel";
import { useDrawingStore } from "@/store/useDrawingStore";

type Tab = "estimate" | "walls";

export default function RightPanel() {
  const [tab, setTab] = useState<Tab>("estimate");
  const { selectedWallId } = useDrawingStore();

  // Auto-switch to Walls tab when user selects a wall
  useEffect(() => {
    if (selectedWallId) setTab("walls");
  }, [selectedWallId]);

  return (
    <div className="hidden md:flex md:w-64 shrink-0 flex-col border-l border-slate-200 bg-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-slate-200">
        {(["estimate", "walls"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
              tab === t
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-slate-500 hover:text-slate-700 border-b-2 border-transparent"
            }`}
          >
            {t === "estimate" ? "Estimate" : "Walls"}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {tab === "estimate" ? <EstimatePanel /> : <WallListPanel />}
      </div>
    </div>
  );
}
