/**
 * Design: Clean Construction App
 * Full-height three-column layout:
 *   Left: Toolbar (56px icon strip)
 *   Center: Canvas (flex-1)
 *   Right: Wall panel (256px)
 * Bottom: Status bar (28px)
 *
 * Keyboard shortcuts: S = select, W = wall, P = pan
 */
import { useEffect } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import Toolbar from "@/components/Toolbar";
import CanvasContainer from "@/components/CanvasContainer";
import WallPanel from "@/components/WallPanel";
import StatusBar from "@/components/StatusBar";

export default function Home() {
  const { setActiveTool } = useDrawingStore();

  // Global keyboard shortcuts for tool switching
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't fire when typing in an input
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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
      {/* Top header bar */}
      <header className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-[9px] leading-none">DW</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            Drywall Estimator
          </span>
        </div>
        <span className="text-slate-500 text-xs ml-1">— Canvas & Wall Drawing</span>
        <div className="flex-1" />
        <span className="text-slate-500 text-xs">MVP v0.1</span>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <CanvasContainer />
        <WallPanel />
      </div>

      <StatusBar />
    </div>
  );
}
