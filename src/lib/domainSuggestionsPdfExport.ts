import jsPDF from "jspdf";

interface DomainSuggestion {
  name: string;
  match: number;
  why: string;
  problems_solved?: string[];
  careers?: string[];
  businesses?: string[];
}

export interface DomainSuggestionResult {
  primary_natural_role?: string;
  supporting_expressions?: string[];
  cognitive_function?: string;
  core_question?: string;
  recommended_domains?: DomainSuggestion[];
  transferability?: { other_domains?: string[]; reason?: string };
  business_models?: { domain: string; problem: string; solution: string; path: string }[];
}

export function exportDomainSuggestionsToPdf(
  result: DomainSuggestionResult,
  meta: { userName?: string; naturalRole?: string | null; savedAt?: string | null }
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginL = 18;
  const marginR = 18;
  const contentWidth = pageWidth - marginL - marginR;
  let y = 20;

  const TEAL: [number, number, number] = [0, 128, 128];
  const DARK: [number, number, number] = [25, 25, 30];
  const MUTED: [number, number, number] = [110, 110, 120];

  const ensure = (h: number) => {
    if (y + h > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const text = (
    str: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; italic?: boolean } = {}
  ) => {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : opts.italic ? "italic" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? DARK));
    const lines = doc.splitTextToSize(str, contentWidth - (opts.indent ?? 0));
    for (const ln of lines) {
      ensure(size * 0.5);
      doc.text(ln, marginL + (opts.indent ?? 0), y);
      y += size * 0.5;
    }
  };

  const section = (title: string) => {
    y += 4;
    ensure(10);
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(marginL, y - 2, marginL + 16, y - 2);
    text(title.toUpperCase(), { size: 11, bold: true, color: TEAL });
    y += 1;
  };

  // Header
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Domain Suggestions", marginL, 9);
  if (meta.savedAt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(new Date(meta.savedAt).toLocaleString(), pageWidth - marginR, 9, { align: "right" });
  }
  y = 24;

  if (meta.userName) text(meta.userName, { size: 13, bold: true });
  if (meta.naturalRole) {
    text("Natural Role", { size: 8, color: MUTED, bold: true });
    text(meta.naturalRole, { size: 10 });
  }

  if (result.cognitive_function) {
    section("Cognitive function");
    text(result.cognitive_function);
  }
  if (result.core_question) {
    section("Core question");
    text(result.core_question, { italic: true });
  }

  if (result.recommended_domains?.length) {
    section("Recommended domains");
    result.recommended_domains.forEach((d, i) => {
      y += 2;
      ensure(10);
      text(`${i + 1}. ${d.name}  —  Match ${d.match}%`, { size: 11, bold: true });
      text(d.why);
      if (d.problems_solved?.length) text(`Problems: ${d.problems_solved.join(" · ")}`, { size: 9, color: MUTED });
      if (d.careers?.length) text(`Careers: ${d.careers.join(", ")}`, { size: 9, color: MUTED });
      if (d.businesses?.length) text(`Businesses: ${d.businesses.join(", ")}`, { size: 9, color: MUTED });
    });
  }

  if (result.transferability?.other_domains?.length) {
    section("Transferability");
    text(result.transferability.other_domains.join(" · "));
    if (result.transferability.reason) text(result.transferability.reason, { size: 9, color: MUTED });
  }

  if (result.business_models?.length) {
    section("Business model paths");
    result.business_models.forEach((b) => {
      y += 2;
      text(`Domain: ${b.domain}`, { size: 10, bold: true });
      text(`Problem: ${b.problem}`);
      text(`Solution: ${b.solution}`);
      text(b.path, { size: 10, bold: true, color: TEAL });
    });
  }

  const safe = (result.recommended_domains?.[0]?.name || "domain-suggestions")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  doc.save(`${safe}.pdf`);
}
