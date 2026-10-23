import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

export interface SalesDocLine { label: string; qty: number; unit_price: number }
export interface SalesDocPdf {
  kind: "service_proposal" | "product_file";
  title: string;
  linkedItem: string;
  clientName: string;
  firmName: string;
  date: string;
  technical: string;
  lines: SalesDocLine[];
  currency: string;
  notes: string;
  logoPath: string | null;
}

async function loadLogo(path: string | null): Promise<{ data: string; w: number; h: number } | null> {
  if (!path) return null;
  try {
    const src = /^https?:/.test(path) ? path
      : (await supabase.storage.from("organization-logos").createSignedUrl(path, 300)).data?.signedUrl;
    if (!src) return null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return { data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight };
  } catch { return null; }
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function exportSalesDocPdf(d: SalesDocPdf) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const logo = await loadLogo(d.logoPath);
  const drawLogo = () => {
    if (!logo) return;
    const h = 16, w = Math.min(40, (logo.w / logo.h) * h);
    doc.addImage(logo.data, "PNG", 14, 10, w, h);
  };
  const isService = d.kind === "service_proposal";
  const docType = isService ? "Technical & Financial Proposal" : "Technical & Financial Product File";

  // Cover page
  drawLogo();
  doc.setTextColor(20, 40, 80);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text(docType, W / 2, 80, { align: "center" });
  if (d.title) { doc.setFontSize(14); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(d.title, W - 40), W / 2, 92, { align: "center" }); }
  const rows: [string, string][] = [
    [isService ? "Type of linked service" : "Product", d.linkedItem || "—"],
    ["Client", d.clientName || "—"],
    ["Firm", d.firmName],
    ["Date", d.date ? new Date(d.date).toLocaleDateString("en-GB") : "—"],
  ];
  autoTable(doc, {
    startY: 120, margin: { left: 30, right: 30 }, body: rows, theme: "grid",
    styles: { fontSize: 12, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60, fillColor: [235, 242, 248] } },
  });

  // Technical
  doc.addPage(); drawLogo();
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(20, 40, 80);
  doc.text(isService ? "1. Technical proposal" : "1. Technical file", 14, 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(30, 30, 30);
  let y = 48;
  for (const line of doc.splitTextToSize(d.technical || "—", W - 28)) {
    if (y > H - 20) { doc.addPage(); drawLogo(); y = 38; }
    doc.text(line, 14, y); y += 6;
  }

  // Financial
  doc.addPage(); drawLogo();
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(20, 40, 80);
  doc.text(isService ? "2. Financial proposal" : "2. Financial file", 14, 38);
  const total = d.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
  autoTable(doc, {
    startY: 46, margin: { top: 32 },
    head: [["Item", "Qty", `Unit price (${d.currency})`, `Amount (${d.currency})`]],
    body: d.lines.map((l) => [l.label, String(l.qty), fmt(Number(l.unit_price) || 0), fmt((Number(l.qty) || 0) * (Number(l.unit_price) || 0))]),
    foot: [["Total", "", "", fmt(total)]],
    headStyles: { fillColor: [20, 40, 80] }, footStyles: { fillColor: [235, 242, 248], textColor: 20, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    didDrawPage: drawLogo,
  });
  if (d.notes) {
    const fy = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(doc.splitTextToSize(d.notes, W - 28), 14, fy);
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`${d.firmName} · ${docType} · ${i}/${n}`, W / 2, H - 8, { align: "center" });
  }
  const safe = (d.title || docType).replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  doc.save(`${d.firmName.replace(/\s+/g, "_")}_${safe}.pdf`);
}
