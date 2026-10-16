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
  thirdParty?: boolean;
  perPerson: (number | null)[];
};

export type MissionPdfData = {
  title: string;
  date?: string;
  context?: string;
  organizationName?: string;
  operationPool: number;
  reserveAmount: number;
  thirdPartyTotal: number;
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

// Standard spaces keep French monetary grouping readable in PDF's built-in Latin font.
const money = (n: number) => new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number.isFinite(n) ? n : 0).replace(/[\u00a0\u202f]/g, " ");
const text = (s: string) => s.replace(/[\u00a0\u202f]/g, " ").replace(/[–—]/g, "-");

export function createMissionPdf(d: MissionPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const width = W - M * 2;
  const pct = (amount: number) => `${money(d.budget > 0 ? amount / d.budget * 100 : 0)}%`;
  const amount = (n: number) => `${money(n)} ${d.currency}`;
  let y = 112;
  doc.setProperties({ title: `${d.title} - Mission distribution`, author: "Box 4 Solutions" });
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 94, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("MISSION DISTRIBUTION", M, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  const titleLines = doc.splitTextToSize(text(d.title || "Untitled mission"), width);
  doc.text(titleLines.slice(0, 2), M, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(text(`${d.organizationName || "Box 4 Solutions"} | Iteration ${d.iteration}`), M, 82);

  const section = (label: string, summary?: string) => {
    // Keep a section heading with its table: move the whole block when the page
    // cannot hold the heading plus the first table row.
    if (y + 150 > H - 42) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEAL);
    doc.setFontSize(11);
    doc.text(text(label), M, y + 12);
    y += 23;
    if (summary) {
      doc.setTextColor(...NAVY);
      doc.setFontSize(9);
      doc.text(text(summary), M, y + 5);
      y += 16;
    }
  };
  const table = (head: string[], body: string[][], numeric: number[] = []) => {
    // Keep a table header with at least one row: never start a table so low that
    // only the header fits before the page break.
    if (y + 110 > H - 42) { doc.addPage(); y = M; }
    autoTable(doc, {
      startY: y, margin: { left: M, right: M, top: M, bottom: 42 },
      head: [head], body: body.map((row) => row.map(text)),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 7, overflow: "linebreak", textColor: NAVY },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: Object.fromEntries(numeric.map((i) => [i, { halign: "right", cellWidth: i === head.length - 1 ? 112 : 82 }])),
      rowPageBreak: "avoid", showHead: "everyPage",
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 20;
  };
  const responsibility = (label: string) => {
    if (/broker|sales|commercial/i.test(label)) return "Technical and financial proposal writing; assurance of client email exchanges.";
    if (/administration|admin/i.test(label)) return "Draft mission distribution; prepare the invoice and send it to the broker / salesperson; add the mission card in Declaration and follow up until payment.";
    if (/quality|qualit/i.test(label)) return `Manage the process and ensure respect of ${d.organizationName || "the organization's"} delivery quality standards, with a rating above 70%.`;
    if (/platform/i.test(label)) return "Platform usage fee for the Box 4 Solutions ecosystem.";
    return "";
  };

  section("Mission brief");
  table(["Detail", "Value"], [
    ["Client", d.client || "Not specified"],
    ["Date", d.date || "Not specified"],
    ["Context", d.context || "Not specified"],
    ["Human Resources Allocated", `${d.organizationName || "Organization"} core team${d.people.length ? ` - ${d.people.join(", ")}` : ""}`],
    ["Budget", amount(d.budget)],
  ]);
  section("Distribution overview");
  table(["Allocation", "% of budget", `Amount (${d.currency})`], [
    ["Entity core team", pct(d.chargesTotal), money(d.chargesTotal)],
    ["Operation Task Force", pct(d.operationPool), money(d.operationPool)],
    ["Third Party Charges", pct(d.thirdPartyTotal), money(d.thirdPartyTotal)],
    ["Reste Structure", pct(d.reserveAmount), money(d.reserveAmount)],
    ["Total distribution", pct(d.chargesTotal + d.operationPool + d.thirdPartyTotal + d.reserveAmount), money(d.chargesTotal + d.operationPool + d.thirdPartyTotal + d.reserveAmount)],
  ], [1, 2]);
  if (d.chargesTotal + d.reserveAmount + d.thirdPartyTotal > d.budget) {
    section("Budget warning", "Core charges, reserve and third-party charges exceed the mission budget.");
  }
  section("Entity core team distribution", `${pct(d.chargesTotal)} of budget | ${amount(d.chargesTotal)}`);
  table(["Role / responsibilities", "% of budget", `Amount (${d.currency})`],
    d.charges.length ? d.charges.map((c) => [
      `${c.label.replace(/quality ensurance/gi, "Quality Assurance")}${responsibility(c.label) ? `\n${responsibility(c.label)}` : ""}`, pct(c.amount), money(c.amount),
    ]) : [["No core-team charges", pct(0), money(0)]], [1, 2]);
  section("People splitting the pool", `Operation Task Force: ${pct(d.operationPool)} of budget | ${amount(d.operationPool)}`);
  table(["Person", "% of budget", `Allocated (${d.currency})`],
    d.people.length ? d.people.map((p, i) => [p, pct(d.perPersonTotal[i] || 0), money(d.perPersonTotal[i] || 0)]) : [["No people allocated", pct(0), money(0)]], [1, 2]);
  const taskForce = d.tasks.filter((t) => !t.locked && !t.thirdParty);
  section("Operation Task Force - task distribution", `Task percentages apply to the task-force pool. Allocated: ${money(d.totalPercent)}%.`);
  table(["Task", "% of task pool", `Amount (${d.currency})`],
    taskForce.length ? taskForce.map((t) => [t.label, `${money(t.percent)}%`, money(t.amount)]) : [["No tasks", "0,00%", "0,00"]], [1, 2]);
  if (d.people.length && taskForce.length) {
    section("Task allocations by person");
    table(["Task / person", `Amount (${d.currency})`], taskForce.flatMap((t) => d.people.map((p, i) => [
      `${t.label} / ${p}`, money(t.perPerson[i] || 0),
    ])), [1]);
  }
  section("Third Party Charges", `${pct(d.thirdPartyTotal)} of budget | ${amount(d.thirdPartyTotal)}`);
  const thirdParty = d.tasks.filter((t) => t.thirdParty && !t.locked);
  table(["Third party / charge", "% of budget", `Amount (${d.currency})`],
    thirdParty.length ? thirdParty.map((t) => [t.label, pct(t.amount), money(t.amount)]) : [["No third-party charges", pct(0), money(0)]], [1, 2]);
  section("Reste Structure", "Percentage of the full mission budget; not distributed among people.");
  table(["Reserve", "% of budget", `Amount (${d.currency})`], [["Reste Structure", pct(d.reserveAmount), money(d.reserveAmount)]], [1, 2]);
  const allocated = d.perPersonTotal.reduce((sum, v) => sum + v, 0);
  if (Math.abs(allocated - d.operationPool) > 0.01) {
    section("Allocation balance", `Task-force pool: ${amount(d.operationPool)} | Allocated to people: ${amount(allocated)}`);
    table(["Balance", `Amount (${d.currency})`], [["Unallocated / (overallocated)", money(d.operationPool - allocated)]], [1]);
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text("Box 4 Solutions | Distribution allocation - not a bank receipt", M, H - 22);
    doc.text(`${i} / ${pages}`, W - M, H - 22, { align: "right" });
  }
  return doc;
}

export function exportMissionPdf(d: MissionPdfData) {
  const safe = (d.title || "mission").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  createMissionPdf(d).save(`${safe}-iteration-${d.iteration}.pdf`);
}
