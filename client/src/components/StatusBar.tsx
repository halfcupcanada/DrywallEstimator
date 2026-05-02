/**
 * Design: Clean Construction App
 * Bottom status bar — shows active tool, wall count, zoom %, keyboard hints.
 * Truncates gracefully on narrow screens.
 */
import { useDrawingStore } from "@/store/useDrawingStore";

export default function StatusBar() {
  const { activeTool, walls, viewport, drawingStart, selectedWallId } =
    useDrawingStore();

  const toolLabels: Record<string, string> = {
    select: "Select",
    wall: "Draw Wall",
    pan: "Pan",
  };

  const hint = () => {
    if (activeTool === "wall") {
      if (!drawingStart) return "Click to place first wall point";
      return "Click to continue · Dbl-click or Esc to finish";
    }
    if (activeTool === "select") {
      if (selectedWallId) return "Delete to remove · Click elsewhere to deselect";
      return "Click a wall to select it";
    }
    if (activeTool === "pan") return "Drag to pan · Scroll to zoom";
    return "";
  };

  return (
    <footer className="h-7 bg-slate-800 border-t border-slate-700 flex items-center px-3 gap-3 text-xs text-slate-400 shrink-0 overflow-hidden">
      <span className="whitespace-nowrap">
        <span className="text-slate-300 font-medium">{toolLabels[activeTool]}</span>
      </span>
      <span className="text-slate-600 hidden sm:inline">|</span>
      <span className="whitespace-nowrap hidden sm:inline">{walls.length} wall{walls.length !== 1 ? "s" : ""}</span>
      <span className="text-slate-600 hidden sm:inline">|</span>
      <span className="whitespace-nowrap hidden sm:inline">{Math.round(viewport.scale * 100)}%</span>
      <span className="text-slate-600 hidden md:inline">|</span>
      <span className="flex-1 truncate hidden md:inline">{hint()}</span>
      <span className="text-slate-600 hidden lg:inline">|</span>
      <span className="whitespace-nowrap hidden lg:inline text-slate-500">Scroll=zoom · Mid-drag=pan · S/W/P=tools · Esc=cancel</span>
    </footer>
  );
}
