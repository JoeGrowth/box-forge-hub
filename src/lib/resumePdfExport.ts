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
  const contentWidth = pageWidth - marginL - marginR;
  let y = 0;

  // ─── Palette ───
  const TEAL: [number, number, number] = [0, 128, 128];
  const TEAL_LIGHT: [number, number, number] = [235, 248, 248];
  const DARK: [number, number, number] = [20, 20, 20];
  const BODY: [number, number, number] = [45, 45, 45];
  const MUTED: [number, number, number] = [110, 110, 110];
  const LIGHT_BG: [number, number, number] = [245, 247, 250];
  const DIVIDER: [number, number, number] = [200, 210, 215];
  const WHITE: [number, number, number] = [255, 255, 255];
  const NAVY: [number, number, number] = [15, 30, 55];

  // ─── Page management ───
  const footerY = pageHeight - 14;
  const safeBottom = footerY - 8;

  const checkPage = (needed: number = 12) => {
    if (y > safeBottom - needed) {
      doc.addPage();
      y = 22;
    }
  };

  // ═══════════════════════════════════════════════
  //  HEADER BAND — navy with teal accent
  // ═══════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 48, "F");

  // Teal accent strip at bottom of header
  doc.setFillColor(...TEAL);
  doc.rect(0, 48, pageWidth, 2.5, "F");

  // Name
  y = 18;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  const displayName = data.userName || "Profile Summary";
  doc.text(displayName, marginL, y);

  // Professional title
  if (data.professionalTitle) {
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 220, 220);
    doc.text(data.professionalTitle, marginL, y);
  }

  // Date on right
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 170, 190);
  doc.text(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    pageWidth - marginR, 40, { align: "right" }
  );

  y = 60;

  // ═══════════════════════════════════════════════
  //  SUMMARY STATEMENT — hero quote block
  // ═══════════════════════════════════════════════
  if (data.summaryStatement) {
    const summaryLines = doc.splitTextToSize(data.summaryStatement, contentWidth - 18);
    const boxH = summaryLines.length * 5.2 + 12;
    checkPage(boxH + 4);

    doc.setFillColor(...TEAL_LIGHT);
    doc.roundedRect(marginL, y - 2, contentWidth, boxH, 2.5, 2.5, "F");

    // Left accent bar
    doc.setFillColor(...TEAL);
    doc.rect(marginL, y - 2, 2.5, boxH, "F");

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BODY);
    let sy = y + 7;
    summaryLines.forEach((line: string) => {
      doc.text(line, marginL + 10, sy);
      sy += 5.2;
    });
    y = sy + 5;
  }

  // ─── Section helpers ───
  const addSectionHeader = (title: string) => {
    checkPage(20);
    y += 2;
    // Teal line
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, marginL + contentWidth, y);
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
    const lines = doc.splitTextToSize(text, contentWidth - 2);
    lines.forEach((line: string) => {
      checkPage();
      doc.text(line, marginL + 1, y);
      y += 5;
    });
    y += 2;
  };

  const addLabelValue = (label: string, value: string | null | undefined) => {
    if (!value) return;
    checkPage(12);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), marginL + 1, y);
    y += 4.5;

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    const lines = doc.splitTextToSize(value, contentWidth - 4);
    lines.forEach((line: string) => {
      checkPage();
      doc.text(line, marginL + 1, y);
      y += 5;
    });
    y += 2;
  };

  const addBulletList = (text: string) => {
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    const items = text.split(/[•\-]\s*|\n/).map(s => s.trim()).filter(Boolean);
    items.forEach((item) => {
      checkPage(7);
      doc.setTextColor(...TEAL);
      doc.text("●", marginL + 3, y);
      doc.setTextColor(...BODY);
      const lines = doc.splitTextToSize(item, contentWidth - 12);
      lines.forEach((line: string) => {
        checkPage();
        doc.text(line, marginL + 9, y);
        y += 5;
      });
    });
    y += 2;
  };

  const addSubSection = (title: string) => {
    checkPage(12);
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
    addSectionHeader("Profile Overview");
    addBodyText(data.bio);
  }

  // ═══════════════════════════════════════════════
  //  2. PROFESSIONAL EXPERIENCE
  // ═══════════════════════════════════════════════
  const hasPractice = data.practiceCheck && data.promiseCheck;
  const hasTraining = data.trainingCheck && data.promiseCheck;
  const hasConsulting = data.consultingCheck && data.promiseCheck;

  if (hasPractice || hasTraining || hasConsulting) {
    addSectionHeader("Professional Experience");

    if (hasPractice) {
      addSubSection("Practice");
      addLabelValue("Entities", data.practiceEntities);
      if (data.practiceCaseStudies != null) {
        addLabelValue("Case Studies", `${data.practiceCaseStudies}`);
      }
    }

    if (hasTraining) {
      addSubSection("Training");
      addLabelValue("Contexts", data.trainingContexts);
      if (data.trainingCount != null) {
        addLabelValue("People Trained", `${data.trainingCount}`);
      }
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
    addSectionHeader("Key Projects & Solutions");
    addBodyText(data.keyProjects);
  }

  // ═══════════════════════════════════════════════
  //  4. SKILLS & COMPETENCIES — tag chips
  // ═══════════════════════════════════════════════
  if (data.primarySkills) {
    addSectionHeader("Skills & Competencies");
    const skills = data.primarySkills.split(",").map(s => s.trim()).filter(Boolean);
    if (skills.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      let xPos = marginL + 1;
      const tagH = 6.5;
      const tagPadX = 4.5;
      const tagGap = 3;

      skills.forEach((skill) => {
        const tw = doc.getTextWidth(skill) + tagPadX * 2;
        if (xPos + tw > pageWidth - marginR) {
          xPos = marginL + 1;
          y += tagH + 3;
          checkPage(tagH + 4);
        }
        // Tag bg
        doc.setFillColor(...TEAL_LIGHT);
        doc.roundedRect(xPos, y - 4.5, tw, tagH, 1.5, 1.5, "F");
        // Tag border
        doc.setDrawColor(...TEAL);
        doc.setLineWidth(0.25);
        doc.roundedRect(xPos, y - 4.5, tw, tagH, 1.5, 1.5, "S");

        doc.setTextColor(...DARK);
        doc.text(skill, xPos + tagPadX, y);
        xPos += tw + tagGap;
      });
      y += tagH + 5;
    }
  }

  // ═══════════════════════════════════════════════
  //  5. EDUCATION & CERTIFICATIONS
  // ═══════════════════════════════════════════════
  if (data.educationCertifications) {
    addSectionHeader("Education & Certifications");
    addBodyText(data.educationCertifications);
  }

  // ═══════════════════════════════════════════════
  //  6. SERVICES ALIGNED TO NATURAL ROLE
  // ═══════════════════════════════════════════════
  if (data.servicesDescription) {
    addSectionHeader("Services Aligned to Your Natural Role");
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
  //  7. NATURAL ROLE + SCALING INTEREST — combined end block
  // ═══════════════════════════════════════════════
  const hasNR = !!data.description;
  const hasScale = data.wantsToScale !== undefined;

  if (hasNR || hasScale) {
    // Estimate block height
    const nrLines = hasNR ? doc.splitTextToSize(data.description!, contentWidth - 16) : [];
    const blockH = (hasNR ? nrLines.length * 5 + 18 : 0) + (hasScale ? 14 : 0) + 10;
    checkPage(blockH + 6);

    y += 4;
    // Full-width navy band
    doc.setFillColor(...NAVY);
    const bandY = y - 2;
    const bandH = blockH;
    doc.roundedRect(marginL, bandY, contentWidth, bandH, 3, 3, "F");

    // Teal left accent
    doc.setFillColor(...TEAL);
    doc.rect(marginL, bandY, 3, bandH, "F");

    const innerX = marginL + 10;
    const innerW = contentWidth - 16;

    if (hasNR) {
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEAL);
      doc.text("NATURAL ROLE", innerX, y);
      y += 5.5;

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(210, 220, 230);
      const descLines = doc.splitTextToSize(data.description!, innerW);
      descLines.forEach((line: string) => {
        doc.text(line, innerX, y);
        y += 5;
      });
      y += 2;
    }

    if (hasScale) {
      if (!hasNR) y += 6;
      // Thin separator if both sections
      if (hasNR) {
        doc.setDrawColor(60, 80, 100);
        doc.setLineWidth(0.3);
        doc.line(innerX, y - 1, innerX + innerW, y - 1);
        y += 4;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEAL);
      doc.text("SCALING INTEREST", innerX, y);

      const badge = data.wantsToScale ? "Yes — Interested in scaling" : "Not currently seeking to scale";
      const dotColor: [number, number, number] = data.wantsToScale ? [0, 200, 120] : [160, 160, 160];
      doc.setFillColor(...dotColor);
      doc.circle(innerX + innerW - doc.getTextWidth(badge) - 8, y - 1.2, 1.8, "F");

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(210, 220, 230);
      doc.text(badge, innerX + innerW - doc.getTextWidth(badge) - 2, y);
      y += 8;
    }
  }

  // ═══════════════════════════════════════════════
  //  FOOTER — all pages
  // ═══════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, footerY - 2, pageWidth - marginR, footerY - 2);

    // Left: name
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(data.userName ? `${data.userName} — Profile Summary` : "Profile Summary", marginL, footerY + 2);

    // Right: page
    doc.text(`${i} / ${pageCount}`, pageWidth - marginR, footerY + 2, { align: "right" });

    // Bottom teal accent
    doc.setFillColor(...TEAL);
    doc.rect(0, pageHeight - 2.5, pageWidth, 2.5, "F");
  }

  // ─── Save ───
  const fileName = data.userName
    ? `profile-summary-${data.userName.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "profile-summary.pdf";

  doc.save(fileName);
}
