/**
 * Room (closed loop) detection for the wall graph.
 *
 * A "room" is a set of walls whose endpoints chain together to form a closed polygon.
 * We build an adjacency graph from wall endpoints (snapping points within CLOSE_THRESHOLD),
 * then find simple cycles.
 */
import type { Wall, Point } from "@/store/useDrawingStore";
import { wallLength } from "./snap";

/** Two endpoints are considered the same node if within this many canvas pixels */
const CLOSE_THRESHOLD = 6;

export interface Room {
  /** Ordered polygon vertices */
  vertices: Point[];
  /** Walls that make up this room */
  wallIds: string[];
  /** Perimeter in feet */
  perimeterFt: number;
  /** Floor area in ft² (Shoelace formula) */
  floorAreaFt2: number;
  /** Total wall area in ft² (sum of length × height for each wall) */
  wallAreaFt2: number;
}

function ptClose(a: Point, b: Point): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < CLOSE_THRESHOLD * CLOSE_THRESHOLD;
}

/** Shoelace formula for polygon area in canvas pixels² */
function polygonArea(pts: Point[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Detect all closed rooms in the wall set.
 * Returns an array of Room objects (may be empty if no closed loops exist).
 */
export function detectRooms(walls: Wall[], pxPerFoot: number): Room[] {
  if (walls.length < 3) return [];

  // Build node list — merge endpoints that are within CLOSE_THRESHOLD
  const nodes: Point[] = [];
  const nodeOf = (pt: Point): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (ptClose(nodes[i], pt)) return i;
    }
    nodes.push({ ...pt });
    return nodes.length - 1;
  };

  // Build adjacency: nodeIndex → [{nodeIndex, wallId}]
  const adj: Map<number, { to: number; wallId: string }[]> = new Map();
  const addEdge = (a: number, b: number, wallId: string) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, wallId });
    adj.get(b)!.push({ to: a, wallId });
  };

  for (const wall of walls) {
    const a = nodeOf(wall.start);
    const b = nodeOf(wall.end);
    if (a !== b) addEdge(a, b, wall.id);
  }

  // Find all nodes with degree >= 2 (potential room corners)
  const validNodes = new Set<number>();
  for (const [node, edges] of Array.from(adj.entries())) {
    if (edges.length >= 2) validNodes.add(node);
  }

  if (validNodes.size < 3) return [];

  // DFS to find shortest simple cycles (rooms)
  const rooms: Room[] = [];
  const foundCycles = new Set<string>();

  const dfs = (
    start: number,
    current: number,
    path: number[],
    wallPath: string[],
    visited: Set<number>
  ) => {
    const edges = adj.get(current) ?? [];
    for (const { to, wallId } of edges) {
      // Found a cycle back to start
      if (to === start && path.length >= 3) {
        const cycle = [...path];
        // Canonical key: sort node indices
        const key = [...cycle].sort((a, b) => a - b).join(",");
        if (!foundCycles.has(key)) {
          foundCycles.add(key);
          const vertices = cycle.map((n) => nodes[n]);
          const wallIds = [...wallPath];
          rooms.push(buildRoom(vertices, wallIds, walls, pxPerFoot));
        }
        continue;
      }
      if (visited.has(to)) continue;
      if (!validNodes.has(to)) continue;
      // Limit cycle length to avoid exponential blowup
      if (path.length > 12) continue;
      visited.add(to);
      dfs(start, to, [...path, to], [...wallPath, wallId], visited);
      visited.delete(to);
    }
  };

  for (const start of Array.from(validNodes)) {
    const visited = new Set<number>([start]);
    dfs(start, start, [start], [], visited);
  }

  // Return unique rooms sorted by floor area descending
  return rooms.sort((a, b) => b.floorAreaFt2 - a.floorAreaFt2);
}

function buildRoom(
  vertices: Point[],
  wallIds: string[],
  walls: Wall[],
  pxPerFoot: number
): Room {
  const areaPx2 = polygonArea(vertices);
  const floorAreaFt2 = areaPx2 / (pxPerFoot * pxPerFoot);

  let perimeterPx = 0;
  let wallAreaFt2 = 0;
  for (const id of wallIds) {
    const wall = walls.find((w) => w.id === id);
    if (!wall) continue;
    const lenPx = wallLength(wall);
    const lenFt = lenPx / pxPerFoot;
    perimeterPx += lenPx;
    wallAreaFt2 += lenFt * wall.height;
  }
  const perimeterFt = perimeterPx / pxPerFoot;

  return { vertices, wallIds, perimeterFt, floorAreaFt2, wallAreaFt2 };
}
