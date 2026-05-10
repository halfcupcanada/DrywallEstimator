/**
 * Design: Clean Construction App
 * Floating overlay that appears when walls form a closed room.
 * Shows perimeter, wall area, floor area, and sheet count for the room.
 */
import { useEffect, useRef, useState } from "react";
import { useDrawingStore } from "@/store/useDrawingStore";
import { detectRooms, type Room } from "@/lib/roomDetect";
import { calculateEstimate } from "@/lib/estimate";
import { X, Home, Layers, Ruler, Square } from "lucide-react";

export default function RoomSummaryOverlay() {
  const { walls, pxPerFoot, sheetSize, wasteFactor, includeCeiling } = useDrawingStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const prevWallCount = useRef(walls.length);

  useEffect(() => {
    const detected = detectRooms(walls, pxPerFoot);
    setRooms(detected);
    // When wall count increases (new wall added), clear dismissals so new rooms show
    if (walls.length > prevWallCount.current) {
      setDismissed(new Set());
    }
    prevWallCount.current = walls.length;
  }, [walls, pxPerFoot]);

  const visibleRooms = rooms.filter((r) => {
    const key = roomKey(r);
    return !dismissed.has(key);
  });

  if (visibleRooms.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 48,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
        width: "min(420px, 90vw)",
      }}
    >
      {visibleRooms.map((room) => {
        const key = roomKey(room);
        const estimate = calculateEstimate({
          totalWallArea: room.wallAreaFt2,
          totalCeilingArea: room.floorAreaFt2,
          sheetSize,
          wasteFactor,
          includeCeiling,
        });

        return (
          <div
            key={key}
            style={{ pointerEvents: "auto", width: "100%" }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/15 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Home size={14} />
                <span className="text-sm font-semibold">Room Closed</span>
                <span className="text-xs bg-blue-500 rounded px-1.5 py-0.5 font-mono">
                  {room.wallIds.length} walls
                </span>
              </div>
              <button
                onClick={() => setDismissed((d) => new Set([...Array.from(d), key]))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-500 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-slate-100">
              <StatCell
                icon={<Ruler size={13} />}
                label="Perimeter"
                value={`${room.perimeterFt.toFixed(1)} ft`}
              />
              <StatCell
                icon={<Square size={13} />}
                label="Floor Area"
                value={`${room.floorAreaFt2.toFixed(1)} ft²`}
              />
              <StatCell
                icon={<Layers size={13} />}
                label="Wall Area"
                value={`${room.wallAreaFt2.toFixed(1)} ft²`}
              />
              <StatCell
                icon={<Layers size={13} className="text-orange-500" />}
                label={`Sheets (${sheetSize})`}
                value={`${estimate.sheetsRequired} sheets`}
                highlight
              />
            </div>

            {/* Material breakdown */}
            <div className="px-4 py-2.5 flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100">
              <span>{estimate.screws.toLocaleString()} screws</span>
              <span className="text-slate-300">·</span>
              <span>{estimate.tapeRolls} tape roll{estimate.tapeRolls !== 1 ? "s" : ""}</span>
              <span className="text-slate-300">·</span>
              <span>{estimate.mudBuckets} mud bucket{estimate.mudBuckets !== 1 ? "s" : ""}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`px-4 py-2.5 bg-white flex items-center gap-2.5 ${highlight ? "bg-orange-50" : ""}`}>
      <span className={`shrink-0 ${highlight ? "text-orange-500" : "text-slate-400"}`}>{icon}</span>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`text-sm font-semibold font-mono ${highlight ? "text-orange-600" : "text-slate-700"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function roomKey(room: Room): string {
  return [...room.wallIds].sort().join("|");
}
