/**
 * Design: Clean Construction App
 * Full-height layout:
 *   Left: Toolbar (56px icon strip)
 *   Center: Canvas (flex-1) + calibration overlay
 *   Right: RightPanel (Estimate | Walls tabs) — desktop only
 * Bottom: Mobile drawer (Estimate | Walls) + StatusBar
 *
 * Keyboard shortcuts: S = select, W = wall, P = pan, C = calibrate
 */
import { useEffect, useState } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import Toolbar from "@/components/Toolbar";
import CanvasContainer from "@/components/CanvasContainer";
import RightPanel from "@/components/RightPanel";
import EstimatePanel from "@/components/EstimatePanel";
import WallListPanel from "@/components/WallListPanel";
import StatusBar from "@/components/StatusBar";
import ScaleCalibratorDialog, {
  type CalibrationState,
} from "@/components/ScaleCalibrator";
import type { Point } from "@/store/useDrawingStore";
import { Layers, Package, ChevronDown, ChevronUp } from "lucide-react";

type MobileTab = "estimate" | "walls";

export default function Home() {
  const { setActiveTool, walls } = useDrawingStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("estimate");

  // Scale calibration state
  const [calibrationState, setCalibrationState] =
    useState<CalibrationState>("idle");
  const [calFirstPoint, setCalFirstPoint] = useState<{ canvas: Point } | null>(null);
  const [calSecondPoint, setCalSecondPoint] = useState<{ canvas: Point } | null>(null);

  // Expose calibration state to CanvasContainer via context or prop drilling
  // We pass it down through a context-like approach using a global on window for simplicity
  useEffect(() => {
    (window as any).__calibration = {
      state: calibrationState,
      setState: setCalibrationState,
      firstPoint: calFirstPoint,
      setFirstPoint: setCalFirstPoint,
      secondPoint: calSecondPoint,
      setSecondPoint: setCalSecondPoint,
    };
  }, [calibrationState, calFirstPoint, calSecondPoint]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "s" || e.key === "S") setActiveTool("select");
      if (e.key === "w" || e.key === "W") setActiveTool("wall");
      if (e.key === "p" || e.key === "P") setActiveTool("pan");
      if (e.key === "Escape") {
        if (calibrationState !== "idle") {
          setCalibrationState("idle");
          setCalFirstPoint(null);
          setCalSecondPoint(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActiveTool, calibrationState]);

  // Calibration banner text
  const calibrationBanner = () => {
    if (calibrationState === "picking-first") return "Click the FIRST calibration point on the canvas";
    if (calibrationState === "picking-second") return "Click the SECOND calibration point on the canvas";
    return null;
  };

  return (
    <div style={{ height: "100dvh" }} className="flex flex-col overflow-hidden bg-slate-900">
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

      {/* ── Calibration banner ──────────────────────────────────────── */}
      {calibrationBanner() && (
        <div className="bg-amber-500 text-white text-xs font-medium px-4 py-1.5 text-center shrink-0 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {calibrationBanner()}
          <button
            onClick={() => { setCalibrationState("idle"); setCalFirstPoint(null); setCalSecondPoint(null); }}
            className="ml-2 underline opacity-80 hover:opacity-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left toolbar */}
        <Toolbar
          calibrationState={calibrationState}
          onStartCalibration={() => {
            setCalibrationState("picking-first");
            setCalFirstPoint(null);
            setCalSecondPoint(null);
          }}
        />

        {/* Canvas */}
        <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
          <CanvasContainer
            calibrationState={calibrationState}
            setCalibrationState={setCalibrationState}
            calFirstPoint={calFirstPoint}
            setCalFirstPoint={setCalFirstPoint}
            calSecondPoint={calSecondPoint}
            setCalSecondPoint={setCalSecondPoint}
          />
        </div>

        {/* Right panel — desktop only */}
        <RightPanel />
      </div>

      {/* ── Mobile bottom panel ─────────────────────────────────────── */}
      <div className="md:hidden shrink-0">
        {/* Toggle button */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-slate-300 text-sm"
        >
          <span className="flex items-center gap-2">
            <Package size={14} />
            <span>Estimate</span>
            <span className="text-slate-500 mx-1">·</span>
            <Layers size={14} />
            <span>Walls</span>
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none ml-1">
              {walls.length}
            </span>
          </span>
          {panelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        {panelOpen && (
          <div className="h-72 flex flex-col border-t border-slate-700 bg-white overflow-hidden">
            {/* Mobile tab bar */}
            <div className="flex shrink-0 border-b border-slate-200">
              {(["estimate", "walls"] as MobileTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMobileTab(t)}
                  className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
                    mobileTab === t
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-slate-500 border-b-2 border-transparent"
                  }`}
                >
                  {t === "estimate" ? "Estimate" : "Walls"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {mobileTab === "estimate" ? <EstimatePanel /> : <WallListPanel />}
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ─────────────────────────────────────────────── */}
      <StatusBar />

      {/* ── Scale calibration dialog ────────────────────────────────── */}
      <ScaleCalibratorDialog
        calibrationState={calibrationState}
        setCalibrationState={setCalibrationState}
        firstPoint={calFirstPoint}
        setFirstPoint={setCalFirstPoint}
        secondPoint={calSecondPoint}
        setSecondPoint={setCalSecondPoint}
      />
    </div>
  );
}
