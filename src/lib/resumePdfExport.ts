import jsPDF from "jspdf";

interface ResumeData {
  userName?: string;
  professionalTitle?: string;
  bio?: string;
  primarySkills?: string;
  yearsOfExperience?: number | null;
  keyProjects?: string;
  educationCertifications?: string;
  summaryStatement?: string;
  description?: string;
  servicesDescription?: string;
  promiseCheck?: boolean;
  practiceCheck?: boolean;
  practiceEntities?: string;
  practiceCaseStudies?: number | null;
  trainingCheck?: boolean;
  trainingContexts?: string;
  trainingCount?: number | null;
  consultingCheck?: boolean;
  consultingWithWhom?: string;
  consultingCaseStudies?: string;
  wantsToScale?: boolean;
}

export function exportResumeToPdf(data: ResumeData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const maxX = pageWidth - marginR;
  const contentWidth = pageWidth - marginL - marginR;
  let y = 0;

  // ─── Palette ───
  const TEAL: [number, number, number] = [0, 128, 128];
  const TEAL_LIGHT: [number, number, number] = [235, 248, 248];
  const DARK: [number, number, number] = [20, 20, 20];
  const BODY: [number, number, number] = [45, 45, 45];
  const MUTED: [number, number, number] = [110, 110, 110];
  const DIVIDER: [number, number, number] = [200, 210, 215];
  const WHITE: [number, number, number] = [255, 255, 255];
  const NAVY: [number, number, number] = [15, 30, 55];

  // ─── Page management ───
  const footerY = pageHeight - 14;
  const safeBottom = footerY - 8;

  const newPage = () => {
    doc.addPage();
    y = 22;
  };

  const checkPage = (needed: number = 12) => {
    if (y + needed > safeBottom) {
      newPage();
    }
  };

  // Helper: estimate how many lines a body text will produce
  const estimateTextHeight = (text: string, width: number, lineH = 5): number => {
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    return doc.splitTextToSize(text, width).length * lineH + 4;
  };

  // ═══════════════════════════════════════════════
  //  HEADER BAND
  // ═══════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 48, "F");
  doc.setFillColor(...TEAL);
  doc.rect(0, 48, pageWidth, 2.5, "F");

  y = 18;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(data.userName || "Profile Summary", marginL, y);

  if (data.professionalTitle) {
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 220, 220);
    const titleLines = doc.splitTextToSize(data.professionalTitle, contentWidth);
    doc.text(titleLines[0], marginL, y);
  }

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 170, 190);
  doc.text(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    maxX, 40, { align: "right" }
  );

  y = 60;

  // ═══════════════════════════════════════════════
  //  SUMMARY STATEMENT
  // ═══════════════════════════════════════════════
  if (data.summaryStatement) {
    const textW = contentWidth - 20;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "italic");
    const summaryLines: string[] = doc.splitTextToSize(data.summaryStatement, textW);
    const lineH = 5.2;
    const boxH = summaryLines.length * lineH + 14;
    checkPage(boxH + 4);

    doc.setFillColor(...TEAL_LIGHT);
    doc.roundedRect(marginL, y - 2, contentWidth, boxH, 2.5, 2.5, "F");
    doc.setFillColor(...TEAL);
    doc.rect(marginL, y - 2, 2.5, boxH, "F");

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BODY);
    let sy = y + 8;
    summaryLines.forEach((line: string) => {
      doc.text(line, marginL + 10, sy);
      sy += lineH;
    });
    y = sy + 6;
  }

  // ─── Section helpers ───
  // addSectionHeader now requires a minContentHeight so the header
  // is never orphaned at the bottom of a page without content
  const addSectionHeader = (title: string, minContentAfter: number = 20) => {
    const needed = 16 + minContentAfter; // header height + minimum content
    checkPage(needed);
    y += 3;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, maxX, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEAL);
    doc.text(title.toUpperCase(), marginL, y);
    y += 7;
  };

  const addBodyText = (text: string) => {
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    const lines: string[] = doc.splitTextToSize(text, contentWidth - 2);
    lines.forEach((line: string) => {
      checkPage(6);
      doc.text(line, marginL + 1, y);
      y += 5;
    });
    y += 3;
  };

  const addLabelValue = (label: string, value: string | null | undefined) => {
    if (!value) return;
    checkPage(14);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), marginL + 1, y);
    y += 4.5;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    const lines: string[] = doc.splitTextToSize(value, contentWidth - 4);
    lines.forEach((line: string) => {
      checkPage(6);
      doc.text(line, marginL + 1, y);
      y += 5;
    });
    y += 2;
  };

  const addBulletList = (text: string) => {
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const items = text.split(/[•\-]\s*|\n/).map(s => s.trim()).filter(Boolean);
    items.forEach((item) => {
      const lines: string[] = doc.splitTextToSize(item, contentWidth - 14);
      checkPage(lines.length * 5 + 2);
      doc.setTextColor(...TEAL);
      doc.text("●", marginL + 3, y);
      doc.setTextColor(...BODY);
      lines.forEach((line: string) => {
        doc.text(line, marginL + 9, y);
        y += 5;
      });
    });
    y += 3;
  };

  const addSubSection = (title: string) => {
    checkPage(16);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(title, marginL + 1, y);
    y += 5.5;
  };

  // ═══════════════════════════════════════════════
  //  1. PROFILE OVERVIEW
  // ═══════════════════════════════════════════════
  if (data.bio) {
    const h = estimateTextHeight(data.bio, contentWidth - 2);
    addSectionHeader("Profile Overview", Math.min(h, 40));
    addBodyText(data.bio);
  }

  // ═══════════════════════════════════════════════
  //  2. PROFESSIONAL EXPERIENCE
  // ═══════════════════════════════════════════════
  const hasPractice = data.practiceCheck && data.promiseCheck;
  const hasTraining = data.trainingCheck && data.promiseCheck;
  const hasConsulting = data.consultingCheck && data.promiseCheck;

  if (hasPractice || hasTraining || hasConsulting) {
    addSectionHeader("Professional Experience", 25);

    if (hasPractice) {
      addSubSection("Practice");
      addLabelValue("Entities", data.practiceEntities);
      if (data.practiceCaseStudies != null) addLabelValue("Case Studies", `${data.practiceCaseStudies}`);
    }
    if (hasTraining) {
      addSubSection("Training");
      addLabelValue("Contexts", data.trainingContexts);
      if (data.trainingCount != null) addLabelValue("People Trained", `${data.trainingCount}`);
    }
    if (hasConsulting) {
      addSubSection("Consulting");
      addLabelValue("Clients", data.consultingWithWhom);
      addLabelValue("Case Studies", data.consultingCaseStudies);
    }
  }

  // ═══════════════════════════════════════════════
  //  3. KEY PROJECTS & SOLUTIONS
  // ═══════════════════════════════════════════════
  if (data.keyProjects) {
    const h = estimateTextHeight(data.keyProjects, contentWidth - 2);
    addSectionHeader("Key Projects & Solutions", Math.min(h, 40));
    addBodyText(data.keyProjects);
  }

  // ═══════════════════════════════════════════════
  //  4. SKILLS & COMPETENCIES
  // ═══════════════════════════════════════════════
  if (data.primarySkills) {
    const skills = data.primarySkills.split(",").map(s => s.trim()).filter(Boolean);
    if (skills.length > 0) {
      // Pre-calculate total tag rows needed
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const tagH = 6.5;
      const tagPadX = 4.5;
      const tagGap = 3;
      let tempX = marginL + 1;
      let rows = 1;
      skills.forEach((skill) => {
        const tw = doc.getTextWidth(skill) + tagPadX * 2;
        if (tempX + tw > maxX) { tempX = marginL + 1; rows++; }
        tempX += tw + tagGap;
      });
      const tagsHeight = rows * (tagH + 3) + 4;

      addSectionHeader("Skills & Competencies", Math.min(tagsHeight, 30));

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      let xPos = marginL + 1;

      skills.forEach((skill) => {
        const tw = doc.getTextWidth(skill) + tagPadX * 2;
        if (xPos + tw > maxX) {
          xPos = marginL + 1;
          y += tagH + 3;
          checkPage(tagH + 4);
        }
        doc.setFillColor(...TEAL_LIGHT);
        doc.roundedRect(xPos, y - 4.5, tw, tagH, 1.5, 1.5, "F");
        doc.setDrawColor(...TEAL);
        doc.setLineWidth(0.25);
        doc.roundedRect(xPos, y - 4.5, tw, tagH, 1.5, 1.5, "S");
        doc.setTextColor(...DARK);
        doc.text(skill, xPos + tagPadX, y);
        xPos += tw + tagGap;
      });
      y += tagH + 6;
    }
  }

  // ═══════════════════════════════════════════════
  //  5. EDUCATION & CERTIFICATIONS
  // ═══════════════════════════════════════════════
  if (data.educationCertifications) {
    const h = estimateTextHeight(data.educationCertifications, contentWidth - 2);
    addSectionHeader("Education & Certifications", Math.min(h, 40));
    addBodyText(data.educationCertifications);
  }

  // ═══════════════════════════════════════════════
  //  6. SERVICES ALIGNED TO NATURAL ROLE
  // ═══════════════════════════════════════════════
  if (data.servicesDescription) {
    addSectionHeader("Services Aligned to Your Natural Role", 25);
    if (data.servicesDescription.includes("•") || data.servicesDescription.includes("-")) {
      const firstBullet = Math.min(
        data.servicesDescription.indexOf("•") >= 0 ? data.servicesDescription.indexOf("•") : 9999,
        data.servicesDescription.indexOf("\n-") >= 0 ? data.servicesDescription.indexOf("\n-") : 9999
      );
      const intro = data.servicesDescription.substring(0, firstBullet).trim();
      const rest = data.servicesDescription.substring(firstBullet).trim();
      if (intro) addBodyText(intro);
      addBulletList(rest);
    } else {
      addBodyText(data.servicesDescription);
    }
  }

  // ═══════════════════════════════════════════════
  //  7. NATURAL ROLE + SCALING INTEREST — side by side
  // ═══════════════════════════════════════════════
  const hasNR = !!data.description;
  const hasScale = data.wantsToScale !== undefined;

  if (hasNR || hasScale) {
    const bandH = 28;
    checkPage(bandH + 10);

    y += 6;
    const bandY = y;

    // Full-width navy band
    doc.setFillColor(...NAVY);
    doc.roundedRect(marginL, bandY, contentWidth, bandH, 3, 3, "F");

    // Teal accent at top of band
    doc.setFillColor(...TEAL);
    doc.rect(marginL, bandY, contentWidth, 2, "F");

    const innerPad = 8;
    const colGap = 6;

    if (hasNR && hasScale) {
      // Two columns side by side
      const colW = (contentWidth - innerPad * 2 - colGap) / 2;
      const leftX = marginL + innerPad;
      const rightX = marginL + innerPad + colW + colGap;

      // Vertical divider
      const divX = marginL + innerPad + colW + colGap / 2;
      doc.setDrawColor(50, 70, 95);
      doc.setLineWidth(0.3);
      doc.line(divX, bandY + 6, divX, bandY + bandH - 6);

      // LEFT: Natural Role
      let ly = bandY + 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEAL);
      doc.text("NATURAL ROLE", leftX, ly);
      ly += 5.5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 230, 240);
      const nrLines: string[] = doc.splitTextToSize(data.description!, colW);
      // Only render what fits (usually 2 lines max in this band)
      const maxLines = 2;
      nrLines.slice(0, maxLines).forEach((line: string) => {
        doc.text(line, leftX, ly);
        ly += 5;
      });

      // RIGHT: Scaling Interest
      let ry = bandY + 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEAL);
      doc.text("SCALING INTEREST", rightX, ry);
      ry += 5.5;

      const badge = data.wantsToScale ? "Yes — Interested in scaling" : "Not currently seeking to scale";
      const dotColor: [number, number, number] = data.wantsToScale ? [0, 200, 120] : [160, 160, 160];

      doc.setFillColor(...dotColor);
      doc.circle(rightX + 1, ry - 1, 1.8, "F");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 230, 240);
      doc.text(badge, rightX + 6, ry);
    } else if (hasNR) {
      // Only NR — centered
      let ly = bandY + 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEAL);
      doc.text("NATURAL ROLE", marginL + innerPad, ly);
      ly += 5.5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 230, 240);
      const lines: string[] = doc.splitTextToSize(data.description!, contentWidth - innerPad * 2);
      lines.slice(0, 2).forEach((line: string) => {
        doc.text(line, marginL + innerPad, ly);
        ly += 5;
      });
    } else if (hasScale) {
      // Only Scale — centered
      let ry = bandY + 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEAL);
      doc.text("SCALING INTEREST", marginL + innerPad, ry);
      ry += 5.5;
      const badge = data.wantsToScale ? "Yes — Interested in scaling" : "Not currently seeking to scale";
      doc.setFillColor(data.wantsToScale ? 0 : 160, data.wantsToScale ? 200 : 160, data.wantsToScale ? 120 : 160);
      doc.circle(marginL + innerPad + 1, ry - 1, 1.8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 230, 240);
      doc.text(badge, marginL + innerPad + 6, ry);
    }

    y = bandY + bandH + 6;
  }

  // ═══════════════════════════════════════════════
  //  FOOTER — all pages
  // ═══════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, footerY - 2, maxX, footerY - 2);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(data.userName ? `${data.userName} — Profile Summary` : "Profile Summary", marginL, footerY + 2);
    doc.text(`${i} / ${pageCount}`, maxX, footerY + 2, { align: "right" });

    doc.setFillColor(...TEAL);
    doc.rect(0, pageHeight - 2.5, pageWidth, 2.5, "F");
  }

  // ─── Save ───
  const fileName = data.userName
    ? `profile-summary-${data.userName.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "profile-summary.pdf";

  doc.save(fileName);
}
