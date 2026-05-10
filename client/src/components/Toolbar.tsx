/**
 * Design: Clean Construction App
 * Left-side icon toolbar — slate-800 background, active tool in orange-500
 */
import { useDrawingStore, type ToolType } from "@/store/useDrawingStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2,
  Pencil,
  Hand,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Ruler,
  DoorOpen,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import type { CalibrationState } from "./ScaleCalibrator";

const TOOLS: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: "select", icon: <MousePointer2 size={18} />, label: "Select", shortcut: "S" },
  { id: "wall", icon: <Pencil size={18} />, label: "Draw Wall", shortcut: "W" },
  { id: "pan", icon: <Hand size={18} />, label: "Pan", shortcut: "P" },
  { id: "opening", icon: <DoorOpen size={18} />, label: "Add Opening", shortcut: "O" },
];

interface Props {
  calibrationState: CalibrationState;
  onStartCalibration: () => void;
}

export default function Toolbar({ calibrationState, onStartCalibration }: Props) {
  const {
    activeTool,
    setActiveTool,
    clearWalls,
    setFloorPlan,
    viewport,
    setViewport,
  } = useDrawingStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const maxW = 1200;
      const ratio = Math.min(1, maxW / img.naturalWidth);
      setFloorPlan(url, {
        width: img.naturalWidth * ratio,
        height: img.naturalHeight * ratio,
      });
      setViewport({ x: 40, y: 40, scale: 1 });
      toast.success("Floor plan loaded");
    };
    img.src = url;
    e.target.value = "";
  };

  const zoomIn = () =>
    setViewport({ ...viewport, scale: Math.min(viewport.scale * 1.25, 8) });
  const zoomOut = () =>
    setViewport({ ...viewport, scale: Math.max(viewport.scale / 1.25, 0.1) });
  const resetView = () => setViewport({ x: 40, y: 40, scale: 1 });

  const handleClearWalls = () => {
    if (confirm("Clear all walls?")) {
      clearWalls();
      toast.info("All walls cleared");
    }
  };

  const isCalibrating = calibrationState !== "idle";

  return (
    <aside className="flex flex-col items-center gap-1 w-14 bg-slate-800 border-r border-slate-700 py-3 shrink-0">
      {/* Logo mark */}
      <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center mb-3">
        <span className="text-white font-bold text-xs leading-none">DW</span>
      </div>

      <div className="w-full h-px bg-slate-700 mb-2" />

      {/* Drawing tools */}
      {TOOLS.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActiveTool(tool.id)}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all
                ${
                  activeTool === tool.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }
              `}
            >
              {tool.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {tool.label} <kbd className="ml-1 opacity-60">{tool.shortcut}</kbd>
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="w-full h-px bg-slate-700 my-2" />

      {/* Upload floor plan */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <Upload size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Upload Floor Plan</TooltipContent>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Scale calibration */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onStartCalibration}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              isCalibrating
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <Ruler size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Calibrate Scale (C)</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Zoom controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={zoomIn} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <ZoomIn size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Zoom In</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={zoomOut} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <ZoomOut size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Zoom Out</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={resetView} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <RotateCcw size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Reset View</TooltipContent>
      </Tooltip>

      <div className="w-full h-px bg-slate-700 my-2" />

      {/* Clear */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={handleClearWalls} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all">
            <Trash2 size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Clear All Walls</TooltipContent>
      </Tooltip>
    </aside>
  );
}
