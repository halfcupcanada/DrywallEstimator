/**
 * Snap utilities for the drawing canvas.
 * Snaps a candidate point to nearby wall endpoints or grid intersections.
 */
import type { Point, Wall } from "@/store/useDrawingStore";

export const SNAP_RADIUS = 12; // pixels in screen space
export const GRID_SIZE = 20;   // pixels in canvas space

/**
 * Snap to the nearest wall endpoint within SNAP_RADIUS (screen pixels).
 * Returns the snapped point and whether a snap occurred.
 */
export function snapToWalls(
  candidate: Point,
  walls: Wall[],
  scale: number
): { point: Point; snapped: boolean } {
  const threshold = SNAP_RADIUS / scale;
  let best: Point | null = null;
  let bestDist = Infinity;

  for (const wall of walls) {
    for (const pt of [wall.start, wall.end]) {
      const dx = pt.x - candidate.x;
      const dy = pt.y - candidate.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < threshold && d < bestDist) {
        bestDist = d;
        best = pt;
      }
    }
  }

  if (best) return { point: best, snapped: true };
  return { point: candidate, snapped: false };
}

/**
 * Snap to the nearest grid intersection.
 */
export function snapToGrid(candidate: Point): Point {
  return {
    x: Math.round(candidate.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(candidate.y / GRID_SIZE) * GRID_SIZE,
  };
}

/**
 * Snap to 45° angles from an origin point (orthogonal + diagonal).
 */
export function snapToAngle(origin: Point, candidate: Point): Point {
  const dx = candidate.x - origin.x;
  const dy = candidate.y - origin.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: origin.x + length * Math.cos(snappedAngle),
    y: origin.y + length * Math.sin(snappedAngle),
  };
}

/**
 * Convert canvas coordinates to screen coordinates.
 */
export function canvasToScreen(
  point: Point,
  viewport: { x: number; y: number; scale: number }
): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

/**
 * Convert screen/stage coordinates to canvas coordinates.
 */
export function screenToCanvas(
  point: Point,
  viewport: { x: number; y: number; scale: number }
): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

/**
 * Calculate wall length in pixels.
 */
export function wallLength(wall: { start: Point; end: Point }): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Midpoint of a wall segment.
 */
export function wallMidpoint(wall: { start: Point; end: Point }): Point {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2,
  };
}
