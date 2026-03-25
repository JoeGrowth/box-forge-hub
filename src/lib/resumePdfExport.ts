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
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 20;

  const TEAL = [0, 128, 128] as const;
  const DARK = [30, 30, 30] as const;
  const MUTED = [100, 100, 100] as const;
  const LIGHT_BG = [245, 245, 245] as const;

  const checkPage = (needed: number = 20) => {
    if (yPosition > 280 - needed) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // ─── Header ───
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Profile Summary", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  if (data.userName) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(data.userName, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 7;
  }

  if (data.professionalTitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...TEAL);
    doc.text(data.professionalTitle, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 7;
  }

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 8;

  // Divider
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  // ─── Helpers ───
  const addSectionHeader = (title: string) => {
    checkPage(25);
    doc.setFillColor(...TEAL);
    doc.rect(margin, yPosition - 4, 3, 14, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(title, margin + 8, yPosition + 6);
    yPosition += 16;
  };

  const addField = (label: string, value: string | null | undefined) => {
    if (!value) return;
    checkPage(15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEAL);
    doc.text(label, margin + 4, yPosition);
    yPosition += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(value, contentWidth - 8);
    lines.forEach((line: string) => {
      checkPage();
      doc.text(line, margin + 4, yPosition);
      yPosition += 5;
    });
    yPosition += 4;
  };

  const addSubSection = (title: string) => {
    checkPage(15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(title, margin + 4, yPosition);
    yPosition += 7;
  };

  // ─── 1. Natural Role ───
  if (data.description) {
    addSectionHeader("Natural Role");
    addField("Role Description", data.description);
  }

  // ─── 2. Profile Overview ───
  if (data.bio || data.primarySkills || data.yearsOfExperience) {
    addSectionHeader("Profile Overview");
    addField("Bio", data.bio);
    addField("Primary Skills", data.primarySkills);
    if (data.yearsOfExperience !== null && data.yearsOfExperience !== undefined) {
      addField("Years of Experience", `${data.yearsOfExperience} years`);
    }
  }

  // ─── 3. Professional Experience ───
  const hasPractice = data.practiceCheck && data.promiseCheck;
  const hasTraining = data.trainingCheck && data.promiseCheck;
  const hasConsulting = data.consultingCheck && data.promiseCheck;

  if (hasPractice || hasTraining || hasConsulting) {
    addSectionHeader("Professional Experience");

    if (hasPractice) {
      addSubSection("Practice Experience");
      addField("Entities Worked With", data.practiceEntities);
      if (data.practiceCaseStudies !== null && data.practiceCaseStudies !== undefined) {
        addField("Case Studies", `${data.practiceCaseStudies}`);
      }
    }

    if (hasTraining) {
      addSubSection("Training Experience");
      addField("Training Contexts", data.trainingContexts);
      if (data.trainingCount !== null && data.trainingCount !== undefined) {
        addField("People Trained", `${data.trainingCount}`);
      }
    }

    if (hasConsulting) {
      addSubSection("Consulting Experience");
      addField("Consulting With", data.consultingWithWhom);
      addField("Case Studies", data.consultingCaseStudies);
    }
  }

  // ─── 4. Key Projects & Solutions ───
  if (data.keyProjects) {
    addSectionHeader("Key Projects & Solutions");
    addField("", data.keyProjects);
  }

  // ─── 5. Skills & Competencies ───
  if (data.primarySkills) {
    addSectionHeader("Skills & Competencies");
    addField("", data.primarySkills);
  }

  // ─── 6. Education & Certifications ───
  if (data.educationCertifications) {
    addSectionHeader("Education & Certifications");
    addField("", data.educationCertifications);
  }

  // ─── 7. Services aligned to Your Natural Role ───
  if (data.servicesDescription) {
    addSectionHeader("Services Aligned to Your Natural Role");
    addField("", data.servicesDescription);
  }

  // ─── 8. Summary Statement ───
  if (data.summaryStatement) {
    addSectionHeader("Summary Statement");
    // Render in a subtle background box
    checkPage(20);
    const summaryLines = doc.splitTextToSize(data.summaryStatement, contentWidth - 16);
    const boxHeight = summaryLines.length * 5 + 10;
    checkPage(boxHeight + 5);
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(margin, yPosition - 4, contentWidth, boxHeight, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(60, 60, 60);
    yPosition += 2;
    summaryLines.forEach((line: string) => {
      doc.text(line, margin + 8, yPosition);
      yPosition += 5;
    });
    yPosition += 8;
  }

  // ─── 9. Scaling Interest ───
  if (data.wantsToScale !== undefined) {
    addSectionHeader("Scaling Interest");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Interested in Scaling: ${data.wantsToScale ? "Yes" : "No"}`, margin + 4, yPosition);
    yPosition += 12;
  }

  // ─── Footer ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200);
    doc.line(margin, 283, pageWidth - margin, 283);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Profile Summary`, margin, 289);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 289, { align: "right" });
  }

  const fileName = data.userName
    ? `profile-summary-${data.userName.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "profile-summary.pdf";

  doc.save(fileName);
}
