/**
 * Room (closed loop) detection for the wall graph.
 *
 * Strategy:
 * 1. Build a node graph from wall endpoints (merge endpoints within CLOSE_THRESHOLD).
 * 2. Find ALL simple cycles via DFS.
 * 3. Filter out sub-cycles: if cycle A's node set is a strict subset of cycle B's node set,
 *    discard A (it is a sub-polygon of B).
 * 4. Among remaining cycles, keep only the one with the LARGEST area per connected component.
 *    This prevents the "3 walls shown when 4 walls form a rectangle" problem where the DFS
 *    finds a shortcut path through 3 of the 4 nodes.
 *
 * Result: one Room per distinct closed region, always the outermost polygon.
 */
import type { Wall, Point } from "@/store/useDrawingStore";
import { wallLength } from "./snap";

/** Two endpoints are considered the same node if within this many canvas pixels */
const CLOSE_THRESHOLD = 8;

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

/** Canonical key for a cycle: sorted node indices joined */
function cycleKey(nodes: number[]): string {
  return [...nodes].sort((a, b) => a - b).join(",");
}

/**
 * Detect closed rooms in the wall set.
 * Returns one Room per distinct closed region (the largest polygon per component).
 */
export function detectRooms(walls: Wall[], pxPerFoot: number): Room[] {
  if (walls.length < 3) return [];

  // ── 1. Build node graph ───────────────────────────────────────────────────

  const nodes: Point[] = [];
  const nodeOf = (pt: Point): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (ptClose(nodes[i], pt)) return i;
    }
    nodes.push({ ...pt });
    return nodes.length - 1;
  };

  // adj: nodeIndex → [{to, wallId}]
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

  // Only nodes with degree ≥ 2 can be part of a cycle
  const validNodes = new Set<number>();
  for (const [node, edges] of Array.from(adj.entries())) {
    if (edges.length >= 2) validNodes.add(node);
  }
  if (validNodes.size < 3) return [];

  // ── 2. DFS: collect ALL simple cycles ────────────────────────────────────

  interface CycleRecord {
    nodeSet: Set<number>;
    nodeList: number[];
    wallIds: string[];
    areaPx2: number;
  }

  const allCycles: CycleRecord[] = [];
  const seenKeys = new Set<string>();

  const dfs = (
    start: number,
    current: number,
    path: number[],
    wallPath: string[],
    visited: Set<number>
  ) => {
    const edges = adj.get(current) ?? [];
    for (const { to, wallId } of edges) {
      if (to === start && path.length >= 3) {
        const key = cycleKey(path);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const verts = path.map((n) => nodes[n]);
          allCycles.push({
            nodeSet: new Set(path),
            nodeList: [...path],
            wallIds: [...wallPath],
            areaPx2: polygonArea(verts),
          });
        }
        continue;
      }
      if (visited.has(to)) continue;
      if (!validNodes.has(to)) continue;
      if (path.length > 14) continue; // safety cap
      visited.add(to);
      dfs(start, to, [...path, to], [...wallPath, wallId], visited);
      visited.delete(to);
    }
  };

  for (const start of Array.from(validNodes)) {
    const visited = new Set<number>([start]);
    dfs(start, start, [start], [], visited);
  }

  if (allCycles.length === 0) return [];

  // ── 3. Remove sub-cycles ──────────────────────────────────────────────────
  // A cycle is a sub-cycle if its node set is a strict subset of another cycle's node set.

  const isSubCycle = (c: CycleRecord): boolean => {
    for (const other of allCycles) {
      if (other === c) continue;
      if (other.nodeSet.size <= c.nodeSet.size) continue;
      let allIn = true;
      for (const n of Array.from(c.nodeSet)) {
        if (!other.nodeSet.has(n)) { allIn = false; break; }
      }
      if (allIn) return true;
    }
    return false;
  };

  const topCycles = allCycles.filter((c) => !isSubCycle(c));

  // ── 4. Per connected component: keep only the largest-area cycle ──────────
  // Two cycles belong to the same component if they share any node.

  const components: CycleRecord[][] = [];
  const assigned = new Set<number>(); // index into topCycles

  for (let i = 0; i < topCycles.length; i++) {
    if (assigned.has(i)) continue;
    const comp: CycleRecord[] = [topCycles[i]];
    assigned.add(i);
    for (let j = i + 1; j < topCycles.length; j++) {
      if (assigned.has(j)) continue;
      // Check if they share a node
      let shared = false;
      for (const n of Array.from(topCycles[i].nodeSet)) {
        if (topCycles[j].nodeSet.has(n)) { shared = true; break; }
      }
      if (shared) {
        comp.push(topCycles[j]);
        assigned.add(j);
      }
    }
    components.push(comp);
  }

  // From each component pick the cycle with the largest area
  const bestCycles = components.map((comp) =>
    comp.reduce((best, c) => (c.areaPx2 > best.areaPx2 ? c : best))
  );

  // ── 5. Build Room objects ─────────────────────────────────────────────────

  const rooms: Room[] = bestCycles.map((c) =>
    buildRoom(c.nodeList.map((n) => nodes[n]), c.wallIds, walls, pxPerFoot)
  );

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
