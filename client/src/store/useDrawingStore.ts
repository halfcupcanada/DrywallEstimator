/**
 * Design: Clean Construction App — slate sidebar, blue primary, orange active tool
 * This store manages all drawing state: walls, active tool, canvas viewport, floor plan image
 */
import { create } from "zustand";
import { nanoid } from "nanoid";
import type { SheetSize } from "@/lib/estimate";

export type ToolType = "select" | "wall" | "pan";

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  /** height in feet */
  height: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

interface DrawingState {
  // Tool
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Walls
  walls: Wall[];
  addWall: (wall: Omit<Wall, "id">) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  clearWalls: () => void;

  // In-progress wall being drawn
  drawingStart: Point | null;
  setDrawingStart: (p: Point | null) => void;

  // Selected wall
  selectedWallId: string | null;
  setSelectedWallId: (id: string | null) => void;

  // Floor plan image
  floorPlanUrl: string | null;
  floorPlanSize: { width: number; height: number } | null;
  setFloorPlan: (url: string, size: { width: number; height: number }) => void;
  clearFloorPlan: () => void;

  // Viewport (pan + zoom)
  viewport: CanvasViewport;
  setViewport: (v: CanvasViewport) => void;

  // Default wall height (feet)
  defaultWallHeight: number;
  setDefaultWallHeight: (h: number) => void;

  // Estimation config
  sheetSize: SheetSize;
  setSheetSize: (s: SheetSize) => void;
  wasteFactor: number;
  setWasteFactor: (f: number) => void;
  includeCeiling: boolean;
  setIncludeCeiling: (v: boolean) => void;

  // Scale: pixels per foot (default 20px = 1ft)
  pxPerFoot: number;
  setPxPerFoot: (v: number) => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  activeTool: "wall",
  setActiveTool: (tool) => set({ activeTool: tool, drawingStart: null }),

  walls: [],
  addWall: (wall) =>
    set((s) => ({ walls: [...s.walls, { ...wall, id: nanoid() }] })),
  updateWall: (id, updates) =>
    set((s) => ({
      walls: s.walls.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),
  deleteWall: (id) =>
    set((s) => ({ walls: s.walls.filter((w) => w.id !== id) })),
  clearWalls: () => set({ walls: [], selectedWallId: null }),

  drawingStart: null,
  setDrawingStart: (p) => set({ drawingStart: p }),

  selectedWallId: null,
  setSelectedWallId: (id) => set({ selectedWallId: id }),

  floorPlanUrl: null,
  floorPlanSize: null,
  setFloorPlan: (url, size) => set({ floorPlanUrl: url, floorPlanSize: size }),
  clearFloorPlan: () => set({ floorPlanUrl: null, floorPlanSize: null }),

  viewport: { x: 0, y: 0, scale: 1 },
  setViewport: (v) => set({ viewport: v }),

   defaultWallHeight: 9,
  setDefaultWallHeight: (h) => set({ defaultWallHeight: h }),

  sheetSize: "4x8",
  setSheetSize: (s) => set({ sheetSize: s }),
  wasteFactor: 0.10,
  setWasteFactor: (f) => set({ wasteFactor: f }),
  includeCeiling: false,
  setIncludeCeiling: (v) => set({ includeCeiling: v }),

  pxPerFoot: 20,
  setPxPerFoot: (v) => set({ pxPerFoot: v }),
}));
