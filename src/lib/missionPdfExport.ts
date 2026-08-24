// PDF export for a single mission distribution page.
// Layout: header block, KPI strip, charges table, people table, task split table.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type MissionPdfCharge = { label: string; percent: number; amount: number };
export type MissionPdfTask = {
  label: string;
  percent: number;
  amount: number;
  locked?: boolean;
  perPerson: (number | null)[];
};

export type MissionPdfData = {
  title: string;
  client: string;
  iteration: number;
  modelName?: string;
  budget: number;
  currency: string;
  chargesTotal: number;
  internalPool: number;
  totalPercent: number;
  charges: MissionPdfCharge[];
  people: string[];
  perPersonTotal: number[];
  tasks: MissionPdfTask[];
};

const NAVY: [number, number, number] = [15, 35, 66];
const TEAL: [number, number, number] = [17, 138, 137];
const LIGHT: [number, number, number] = [240, 244, 248];

const money = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export function exportMissionPdf(d: MissionPdfData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 86, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(d.title || "Untitled mission", M, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const sub = [
    d.client ? `Client · ${d.client}` : null,
    `Iteration (${d.iteration})`,
    d.modelName ? `model ${d.modelName}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(sub, M, 58);
  doc.setFontSize(8);
  doc.text("Mission distribution page — Box 4 Solutions", M, 74);

  // KPI strip
  let y = 104;
  const kpis: Array<[string, string]> = [
    ["Budget", `${money(d.budget)} ${d.currency}`],
    [
      "Total charges",
      `${money(d.chargesTotal)} (${d.budget > 0 ? ((d.chargesTotal / d.budget) * 100).toFixed(2) : "0.00"}%)`,
    ],
    ["Pool to distribute", `${money(d.internalPool)} ${d.currency}`],
    ["Tasks allocated", `${d.totalPercent}%`],
  ];
  const cardW = (W - M * 2 - 18) / 4;
  kpis.forEach(([label, value], i) => {
    const x = M + i * (cardW + 6);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, cardW, 46, 4, 4, "F");
    doc.setTextColor(110, 120, 135);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), x + 10, y + 16);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(value, x + 10, y + 34);
  });
  y += 66;

  const section = (label: string, startY: number) => {
    doc.setTextColor(...TEAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, M, startY);
    return startY + 8;
  };

  // Charges
  let cursor = section("Charges", y);
  autoTable(doc, {
    startY: cursor,
    margin: { left: M, right: M },
    head: [["Item", "%", "Amount"]],
    body: [
      ...d.charges.map((c) => [c.label, `${c.percent.toFixed(2)}%`, money(c.amount)]),
      [
        "Total charges",
        `${d.budget > 0 ? ((d.chargesTotal / d.budget) * 100).toFixed(2) : "0.00"}%`,
        money(d.chargesTotal),
      ],
      [
        "Total structural reserve",
        `${d.budget > 0 ? ((d.internalPool / d.budget) * 100).toFixed(2) : "0.00"}%`,
        money(d.internalPool),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index >= d.charges.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = LIGHT;
      }
    },
  });

  // People
  cursor = ((doc as any).lastAutoTable?.finalY ?? cursor) + 26;
  cursor = section("People splitting the pool", cursor);
  autoTable(doc, {
    startY: cursor,
    margin: { left: M, right: M },
    head: [["Person", `Total (${d.currency})`]],
    body: d.people.map((p, i) => [p, money(d.perPersonTotal[i] || 0)]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
  });

  // Tasks
  cursor = ((doc as any).lastAutoTable?.finalY ?? cursor) + 26;
  cursor = section("Internal & Structure — task distribution", cursor);
  autoTable(doc, {
    startY: cursor,
    margin: { left: M, right: M },
    head: [["Task", "%", "Amount", ...d.people]],
    body: [
      ...d.tasks.map((t) => [
        t.locked ? `${t.label} (not split)` : t.label,
        `${t.percent}%`,
        money(t.amount),
        ...t.perPerson.map((v) => (v === null ? "—" : money(v))),
      ]),
      [
        "Total",
        `${d.totalPercent}%`,
        money(d.internalPool),
        ...d.perPersonTotal.map((v) => money(v || 0)),
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 4.5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    didParseCell: (data) => {
      if (data.column.index >= 3) data.cell.styles.halign = "right";
      if (data.section === "body" && data.row.index === d.tasks.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = LIGHT;
      }
    },
  });

  const safe = (d.title || "mission").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safe}-iteration-${d.iteration}.pdf`);
}
