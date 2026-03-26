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
  const marginL = 22;
  const marginR = 22;
  const contentWidth = pageWidth - marginL - marginR;
  let y = 0;

  // ─── Palette ───
  const TEAL: [number, number, number] = [0, 128, 128];
  const TEAL_LIGHT: [number, number, number] = [230, 245, 245];
  const DARK: [number, number, number] = [25, 25, 25];
  const BODY: [number, number, number] = [50, 50, 50];
  const MUTED: [number, number, number] = [120, 120, 120];
  const LIGHT_BG: [number, number, number] = [248, 248, 248];
  const DIVIDER: [number, number, number] = [210, 210, 210];
  const WHITE: [number, number, number] = [255, 255, 255];

  // ─── Page management ───
  const footerY = pageHeight - 14;
  const safeBottom = footerY - 6;

  const checkPage = (needed: number = 12) => {
    if (y > safeBottom - needed) {
      doc.addPage();
      y = 24;
    }
  };

  // ═══════════════════════════════════════════════
  //  COVER HEADER BAND
  // ═══════════════════════════════════════════════
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 52, "F");

  // Name
  y = 20;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  const displayName = data.userName || "Profile Summary";
  doc.text(displayName, marginL, y);

  // Professional title
  if (data.professionalTitle) {
    y += 9;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 250, 250);
    doc.text(data.professionalTitle, marginL, y);
  }

  // Date on right
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 230);
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageWidth - marginR, 44, { align: "right" });

  y = 62;

  // ═══════════════════════════════════════════════
  //  SUMMARY STATEMENT — hero block right after header
  // ═══════════════════════════════════════════════
  if (data.summaryStatement) {
    const summaryLines = doc.splitTextToSize(data.summaryStatement, contentWidth - 20);
    const boxH = summaryLines.length * 5.5 + 14;
    checkPage(boxH + 4);

    doc.setFillColor(...TEAL_LIGHT);
    doc.roundedRect(marginL, y - 2, contentWidth, boxH, 3, 3, "F");

    // Left accent bar
    doc.setFillColor(...TEAL);
    doc.rect(marginL, y - 2, 3, boxH, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BODY);
    let sy = y + 8;
    summaryLines.forEach((line: string) => {
      doc.text(line, marginL + 12, sy);
      sy += 5.5;
    });
    y = sy + 6;
  }

  // ─── Section helpers ───
  const addSectionHeader = (title: string) => {
    checkPage(22);
    // Thin teal line
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(marginL, y, marginL + contentWidth, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEAL);
    doc.text(title.toUpperCase(), marginL, y);
    y += 8;
  };

  const addBodyText = (text: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    const lines = doc.splitTextToSize(text, contentWidth - 4);
    lines.forEach((line: string) => {
      checkPage();
      doc.text(line, marginL + 2, y);
      y += 5.2;
    });
    y += 3;
  };

  const addLabelValue = (label: string, value: string | null | undefined) => {
    if (!value) return;
    checkPage(14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), marginL + 2, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    const lines = doc.splitTextToSize(value, contentWidth - 6);
    lines.forEach((line: string) => {
      checkPage();
      doc.text(line, marginL + 2, y);
      y += 5.2;
    });
    y += 3;
  };

  const addBulletList = (text: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    // Split by bullet chars or newlines
    const items = text.split(/[•\-]\s*|\n/).map(s => s.trim()).filter(Boolean);
    items.forEach((item) => {
      checkPage(8);
      doc.text("•", marginL + 4, y);
      const lines = doc.splitTextToSize(item, contentWidth - 14);
      lines.forEach((line: string, idx: number) => {
        checkPage();
        doc.text(line, marginL + 10, y);
        y += 5.2;
      });
    });
    y += 2;
  };

  const addSubSection = (title: string) => {
    checkPage(14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(title, marginL + 2, y);
    y += 6;
  };

  // ═══════════════════════════════════════════════
  //  1. NATURAL ROLE
  // ═══════════════════════════════════════════════
  if (data.description) {
    addSectionHeader("Natural Role");
    addBodyText(data.description);
  }

  // ═══════════════════════════════════════════════
  //  2. PROFILE OVERVIEW
  // ═══════════════════════════════════════════════
  if (data.bio) {
    addSectionHeader("Profile Overview");
    addBodyText(data.bio);
  }

  // ═══════════════════════════════════════════════
  //  3. PROFESSIONAL EXPERIENCE
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
  //  4. KEY PROJECTS & SOLUTIONS
  // ═══════════════════════════════════════════════
  if (data.keyProjects) {
    addSectionHeader("Key Projects & Solutions");
    addBodyText(data.keyProjects);
  }

  // ═══════════════════════════════════════════════
  //  5. SKILLS & COMPETENCIES
  // ═══════════════════════════════════════════════
  if (data.primarySkills) {
    addSectionHeader("Skills & Competencies");
    // Render as inline chips-style or comma list
    const skills = data.primarySkills.split(",").map(s => s.trim()).filter(Boolean);
    if (skills.length > 0) {
      checkPage(14);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BODY);

      // Render as a wrapped tag row
      let xPos = marginL + 2;
      const tagH = 7;
      const tagPadX = 5;
      const tagGap = 3;

      skills.forEach((skill) => {
        const tw = doc.getTextWidth(skill) + tagPadX * 2;
        if (xPos + tw > pageWidth - marginR) {
          xPos = marginL + 2;
          y += tagH + 3;
          checkPage(tagH + 4);
        }
        // Tag background
        doc.setFillColor(...LIGHT_BG);
        doc.roundedRect(xPos, y - 5, tw, tagH, 2, 2, "F");
        // Tag border
        doc.setDrawColor(...DIVIDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(xPos, y - 5, tw, tagH, 2, 2, "S");

        doc.setTextColor(...BODY);
        doc.text(skill, xPos + tagPadX, y);
        xPos += tw + tagGap;
      });
      y += tagH + 6;
    }
  }

  // ═══════════════════════════════════════════════
  //  6. EDUCATION & CERTIFICATIONS
  // ═══════════════════════════════════════════════
  if (data.educationCertifications) {
    addSectionHeader("Education & Certifications");
    addBodyText(data.educationCertifications);
  }

  // ═══════════════════════════════════════════════
  //  7. SERVICES ALIGNED TO NATURAL ROLE
  // ═══════════════════════════════════════════════
  if (data.servicesDescription) {
    addSectionHeader("Services Aligned to Your Natural Role");
    // Check if content has bullet points
    if (data.servicesDescription.includes("•") || data.servicesDescription.includes("-")) {
      // Extract potential intro line (text before first bullet)
      const firstBullet = Math.min(
        data.servicesDescription.indexOf("•") >= 0 ? data.servicesDescription.indexOf("•") : 9999,
        data.servicesDescription.indexOf("\n-") >= 0 ? data.servicesDescription.indexOf("\n-") : 9999
      );
      const intro = data.servicesDescription.substring(0, firstBullet).trim();
      const rest = data.servicesDescription.substring(firstBullet).trim();
      if (intro) {
        addBodyText(intro);
      }
      addBulletList(rest);
    } else {
      addBodyText(data.servicesDescription);
    }
  }

  // ═══════════════════════════════════════════════
  //  8. SCALING INTEREST
  // ═══════════════════════════════════════════════
  if (data.wantsToScale !== undefined) {
    addSectionHeader("Scaling Interest");
    checkPage(10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);

    const badge = data.wantsToScale ? "Yes — Interested in scaling" : "Not currently seeking to scale";
    // Small indicator dot
    doc.setFillColor(data.wantsToScale ? 0 : 160, data.wantsToScale ? 160 : 160, data.wantsToScale ? 80 : 160);
    doc.circle(marginL + 5, y - 1.5, 2, "F");
    doc.text(badge, marginL + 11, y);
    y += 10;
  }

  // ═══════════════════════════════════════════════
  //  FOOTER — all pages
  // ═══════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.4);
    doc.line(marginL, footerY - 2, pageWidth - marginR, footerY - 2);

    // Left: name or "Profile Summary"
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(data.userName ? `${data.userName} — Profile Summary` : "Profile Summary", marginL, footerY + 2);

    // Right: page number
    doc.text(`${i} / ${pageCount}`, pageWidth - marginR, footerY + 2, { align: "right" });

    // Teal accent line at very bottom
    doc.setFillColor(...TEAL);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }

  // ─── Save ───
  const fileName = data.userName
    ? `profile-summary-${data.userName.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "profile-summary.pdf";

  doc.save(fileName);
}
