/**
 * Design: Clean Construction App
 * Full-height layout using CSS Grid (not flex) to guarantee the canvas
 * always gets its fair share of space regardless of screen width.
 *
 * Grid columns: [toolbar 56px] [canvas 1fr] [wall-panel 256px]
 * The canvas column uses `1fr` so it always fills remaining space.
 * On screens < 768px the wall panel collapses to a bottom drawer.
 *
 * Keyboard shortcuts: S = select, W = wall, P = pan
 */
import { useEffect, useState } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import Toolbar from "@/components/Toolbar";
import CanvasContainer from "@/components/CanvasContainer";
import WallPanel from "@/components/WallPanel";
import StatusBar from "@/components/StatusBar";
import { Layers, ChevronDown, ChevronUp } from "lucide-react";

export default function Home() {
  const { setActiveTool, walls } = useDrawingStore();
  const [panelOpen, setPanelOpen] = useState(false);

  // Global keyboard shortcuts for tool switching
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "s" || e.key === "S") setActiveTool("select");
      if (e.key === "w" || e.key === "W") setActiveTool("wall");
      if (e.key === "p" || e.key === "P") setActiveTool("pan");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActiveTool]);

  return (
    <div
      style={{ height: "100dvh" }}
      className="flex flex-col overflow-hidden bg-slate-900"
    >
      {/* ── Top header ─────────────────────────────────────────────── */}
      <header className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-3 gap-2 shrink-0">
        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-[9px] leading-none">DW</span>
        </div>
        <span className="text-white font-semibold text-sm tracking-wide whitespace-nowrap">
          Drywall Estimator
        </span>
        <span className="text-slate-500 text-xs hidden sm:inline whitespace-nowrap">
          — Canvas &amp; Wall Drawing
        </span>
        <div className="flex-1" />
        <span className="text-slate-500 text-xs">v0.1</span>
      </header>

      {/* ── Main area (grid on desktop, stacked on mobile) ──────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left toolbar — always visible */}
        <Toolbar />

        {/* Canvas — takes all remaining horizontal space */}
        <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
          <CanvasContainer />
        </div>

        {/* Right panel — hidden on small screens, shown on md+ */}
        <div className="hidden md:flex md:w-64 shrink-0">
          <WallPanel />
        </div>
      </div>

      {/* ── Mobile wall panel toggle ────────────────────────────────── */}
      <div className="md:hidden shrink-0">
        {/* Toggle button */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-slate-300 text-sm"
        >
          <span className="flex items-center gap-2">
            <Layers size={14} />
            Walls
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
              {walls.length}
            </span>
          </span>
          {panelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        {/* Collapsible panel */}
        {panelOpen && (
          <div className="h-64 overflow-hidden border-t border-slate-700">
            <WallPanel />
          </div>
        )}
      </div>

      {/* ── Status bar ─────────────────────────────────────────────── */}
      <StatusBar />
    </div>
  );
}
