/**
 * generateEstimatePDF — branded HalfCup estimate report
 * Uses jspdf + jspdf-autotable for a clean, printable PDF.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Wall, Opening } from "@/store/useDrawingStore";
import { detectRooms } from "./roomDetect";
import { calculateEstimate } from "./estimate";
import type { SheetSize } from "./estimate";

export interface ExportOptions {
  projectName: string;
  companyName?: string;
  sheetSize: SheetSize;
  wasteFactor: number; // 0–0.30
  defaultWallHeight: number;
  walls: Wall[];
  openings: Opening[];
  pxPerFoot: number;
}

function wallLengthFt(wall: Wall, pxPerFoot: number) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy) / pxPerFoot;
}

const ORANGE: [number, number, number] = [220, 90, 30];
const DARK: [number, number, number] = [30, 30, 40];
const GRAY: [number, number, number] = [100, 100, 110];
const LIGHT_BG: [number, number, number] = [250, 248, 245];

export function generateEstimatePDF(opts: ExportOptions) {
  const {
    projectName,
    companyName,
    sheetSize,
    wasteFactor,
    defaultWallHeight,
    walls,
    openings,
    pxPerFoot,
  } = opts;

  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // ── Header band ───────────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageW, 22, "F");

  // Simple half-cup icon
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.circle(margin + 5, 11, 5, "S");
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, 11, 10, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("DrywallPro", margin + 13, 10);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("by HalfCup", margin + 13, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Estimate Report", pageW - margin, 10, { align: "right" });
  doc.text(
    new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }),
    pageW - margin,
    15,
    { align: "right" }
  );

  y = 30;

  // ── Project title ─────────────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(projectName || "Untitled Project", margin, y);
  y += 6;

  if (companyName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(companyName, margin, y);
    y += 5;
  }

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Compute totals ────────────────────────────────────────────────────────
  const rooms = detectRooms(walls, pxPerFoot);
  const totalFloorAreaFt2 = rooms.reduce((acc, r) => acc + r.floorAreaFt2, 0);

  const totalWallAreaFt2 = walls.reduce((acc, w) => {
    const len = wallLengthFt(w, pxPerFoot);
    const h = w.height ?? defaultWallHeight;
    const wallOpenings = openings.filter((o) => o.wallId === w.id);
    const openingArea = wallOpenings.reduce((a, o) => a + o.widthFt * o.heightFt, 0);
    return acc + Math.max(0, len * h - openingArea);
  }, 0);

  const estimate = calculateEstimate({
    totalWallArea: totalWallAreaFt2,
    totalCeilingArea: totalFloorAreaFt2,
    sheetSize,
    wasteFactor,
    includeCeiling: false,
  });

  // ── Summary box ───────────────────────────────────────────────────────────
  const summaryItems: [string, string][] = [
    ["Walls", `${walls.length}`],
    ["Total Wall Area", `${totalWallAreaFt2.toFixed(1)} ft²`],
    ["Floor Area", `${totalFloorAreaFt2.toFixed(1)} ft²`],
    ["Sheet Size", sheetSize],
    ["Waste Factor", `${(wasteFactor * 100).toFixed(0)}%`],
    ["Sheets Required", `${estimate.sheetsRequired}`],
    ["Screws", `${estimate.screws.toLocaleString()}`],
    ["Tape Rolls", `${estimate.tapeRolls}`],
    ["Mud Buckets", `${estimate.mudBuckets}`],
  ];

  const colW = (pageW - margin * 2) / 3;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "F");

  summaryItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + 4 + col * colW;
    const iy = y + 6 + row * 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(item[0], x, iy);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(item[1], x, iy + 4);
  });

  y += 34;

  // ── Wall list ─────────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Wall Details", margin, y);
  y += 4;

  const wallRows = walls.map((w, i) => {
    const len = wallLengthFt(w, pxPerFoot);
    const h = w.height ?? defaultWallHeight;
    const wallOpenings = openings.filter((o) => o.wallId === w.id);
    const openingArea = wallOpenings.reduce((a, o) => a + o.widthFt * o.heightFt, 0);
    const netArea = Math.max(0, len * h - openingArea);
    return [
      `Wall ${i + 1}`,
      `${len.toFixed(1)} ft`,
      `${h} ft`,
      `${(len * h).toFixed(1)} ft²`,
      openingArea > 0 ? `−${openingArea.toFixed(1)} ft²` : "—",
      `${netArea.toFixed(1)} ft²`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Length", "Height", "Gross Area", "Openings", "Net Area"]],
    body: wallRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: ORANGE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 22 },
      2: { cellWidth: 18 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26 },
      5: { cellWidth: 26 },
    },
  });

  // @ts-ignore — jspdf-autotable extends the doc instance
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Openings list ─────────────────────────────────────────────────────────
  if (openings.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Openings (Doors & Windows)", margin, y);
    y += 4;

    const openingRows = openings.map((o, i) => {
      const wall = walls.find((w) => w.id === o.wallId);
      const wallIdx = wall ? walls.indexOf(wall) + 1 : "?";
      return [
        `${i + 1}`,
        o.type === "door" ? "Door" : "Window",
        `Wall ${wallIdx}`,
        `${o.widthFt.toFixed(1)} ft`,
        `${o.heightFt.toFixed(1)} ft`,
        `${(o.widthFt * o.heightFt).toFixed(1)} ft²`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Type", "Wall", "Width", "Height", "Area"]],
      body: openingRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT_BG },
    });
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("DrywallPro by HalfCup · drywall.halfcup.ca", margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  const safeName = (projectName || "estimate").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${safeName}_estimate.pdf`);
}
