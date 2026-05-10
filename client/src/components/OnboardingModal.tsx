/**
 * OnboardingModal — first-run checklist for new users.
 * Shows once after login. Persists completion state in localStorage.
 * Steps: Draw a wall → Close the room → Read the estimate → Download PDF
 *
 * Step detection:
 *  draw_wall   — walls.length >= 1
 *  close_room  — detectRooms(walls, pxPerFoot).length >= 1 (real closed polygon)
 *  read_estimate — localStorage flag set when Estimate panel is opened
 *  download_pdf  — localStorage flag set when PDF export is triggered
 */
import { useState, useEffect } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import { detectRooms } from "@/lib/roomDetect";
import {
  PenLine,
  Home,
  BarChart3,
  FileDown,
  X,
  ChevronRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const ONBOARDING_DISMISSED_KEY = "drywallpro_onboarding_dismissed";
export const ONBOARDING_ESTIMATE_KEY = "drywallpro_onboarding_estimate_viewed";
export const ONBOARDING_PDF_KEY = "drywallpro_onboarding_pdf_downloaded";

interface Step {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  hint: string;
}

const STEPS: Step[] = [
  {
    id: "draw_wall",
    icon: <PenLine size={18} />,
    title: "Draw your first wall",
    description: "Select the Draw Wall tool (pencil icon) and click two points on the canvas.",
    hint: "Press W or tap the pencil icon in the toolbar",
  },
  {
    id: "close_room",
    icon: <Home size={18} />,
    title: "Close the room",
    description: "Connect your last wall back to the first point to close the polygon.",
    hint: "Snap to the starting point — it glows cyan when close enough",
  },
  {
    id: "read_estimate",
    icon: <BarChart3 size={18} />,
    title: "Read the estimate",
    description: "A room summary card appears automatically with sheet count, screws, tape and mud.",
    hint: "Open the Estimate tab on the right panel for the full breakdown",
  },
  {
    id: "download_pdf",
    icon: <FileDown size={18} />,
    title: "Download the PDF report",
    description: "Tap 'Download Report' in the Estimate panel to get a branded PDF for your client.",
    hint: "You can enter a project name before downloading",
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [estimateViewed, setEstimateViewed] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const { walls, pxPerFoot } = useDrawingStore();

  // Show on first load if not dismissed
  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (done) {
      setDismissed(true);
      return;
    }
    // Small delay so the canvas renders first
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Poll localStorage flags for estimate + pdf steps
  useEffect(() => {
    const check = () => {
      if (localStorage.getItem(ONBOARDING_ESTIMATE_KEY)) setEstimateViewed(true);
      if (localStorage.getItem(ONBOARDING_PDF_KEY)) setPdfDownloaded(true);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute completed steps
  const hasRoom = detectRooms(walls, pxPerFoot).length > 0;
  const completedSteps = new Set<string>();
  if (walls.length >= 1) completedSteps.add("draw_wall");
  if (hasRoom) completedSteps.add("close_room");
  if (estimateViewed) completedSteps.add("read_estimate");
  if (pdfDownloaded) completedSteps.add("download_pdf");

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    setDismissed(true);
    setVisible(false);
  };

  const handleMinimize = () => setVisible(false);

  if (dismissed) return null;

  // Floating badge when minimized
  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-16 right-4 z-50 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors"
        title="Open getting started guide"
      >
        <Home size={12} />
        Getting Started
        <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
          {completedSteps.size}/{STEPS.length}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-100 text-xs font-medium uppercase tracking-widest mb-1">
                Welcome to DrywallPro
              </p>
              <h2 className="text-xl font-bold">Get started in 4 steps</h2>
              <p className="text-orange-100 text-sm mt-1">
                Your first estimate takes about 2 minutes.
              </p>
            </div>
            <button
              onClick={handleMinimize}
              className="text-white/70 hover:text-white mt-0.5 transition-colors"
              title="Minimize"
            >
              <X size={18} />
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-4 bg-white/20 rounded-full h-1.5">
            <div
              className="bg-white rounded-full h-1.5 transition-all duration-500"
              style={{ width: `${(completedSteps.size / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-orange-100 text-xs mt-1.5">
            {completedSteps.size} of {STEPS.length} steps complete
          </p>
        </div>

        {/* Steps */}
        <div className="divide-y divide-gray-100">
          {STEPS.map((step, idx) => {
            const done = completedSteps.has(step.id);
            // Current active step = first incomplete step in order
            const orderedIds = STEPS.map((s) => s.id);
            const firstIncomplete = orderedIds.find((id) => !completedSteps.has(id));
            const isActive = step.id === firstIncomplete;
            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                  done ? "bg-green-50/50" : isActive ? "bg-orange-50/40" : ""
                }`}
              >
                {/* Status icon */}
                <div className={`mt-0.5 shrink-0 ${done ? "text-green-500" : isActive ? "text-orange-500" : "text-gray-300"}`}>
                  {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${done ? "text-green-600" : isActive ? "text-orange-600" : "text-gray-400"}`}>
                      Step {idx + 1}
                    </span>
                  </div>
                  <p className={`font-semibold text-sm mt-0.5 ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {step.title}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                  {!done && isActive && (
                    <p className="text-orange-500 text-xs mt-1 font-medium flex items-center gap-1">
                      <ChevronRight size={12} />
                      {step.hint}
                    </p>
                  )}
                </div>
                {/* Tool icon */}
                <div className={`shrink-0 mt-0.5 ${done ? "text-green-400" : isActive ? "text-orange-400" : "text-gray-200"}`}>
                  {step.icon}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-xs transition-colors"
          >
            Don't show again
          </button>
          <Button
            onClick={handleMinimize}
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm h-9 px-4"
          >
            Start drawing
            <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
