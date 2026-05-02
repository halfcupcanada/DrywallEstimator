/**
 * Design: Clean Construction App
 * Bottom status bar — shows active tool, wall count, zoom %, keyboard hints
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
      return "Click to place next point · Double-click or Esc to finish";
    }
    if (activeTool === "select") {
      if (selectedWallId) return "Wall selected · Delete to remove · Click elsewhere to deselect";
      return "Click a wall to select it";
    }
    if (activeTool === "pan") return "Click and drag to pan · Scroll to zoom";
    return "";
  };

  return (
    <footer className="h-7 bg-slate-800 border-t border-slate-700 flex items-center px-4 gap-6 text-xs text-slate-400 shrink-0">
      <span>
        <span className="text-slate-300 font-medium">{toolLabels[activeTool]}</span>
      </span>
      <span className="text-slate-600">|</span>
      <span>{walls.length} wall{walls.length !== 1 ? "s" : ""}</span>
      <span className="text-slate-600">|</span>
      <span>{Math.round(viewport.scale * 100)}% zoom</span>
      <span className="text-slate-600">|</span>
      <span className="flex-1">{hint()}</span>
      <span className="text-slate-600">|</span>
      <span>Scroll = zoom · Middle-drag = pan · S/W/P = tools · Esc = cancel</span>
    </footer>
  );
}
