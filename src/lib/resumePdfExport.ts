import jsPDF from "jspdf";

interface ResumeData {
  // Profile info
  userName?: string;
  bio?: string;
  primarySkills?: string;
  yearsOfExperience?: number | null;
  // Natural role data
  description?: string;
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
}

export function exportResumeToPdf(data: ResumeData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 20;

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Professional Resume", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 12;

  if (data.userName) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(data.userName, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
  }

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: "center" });
  doc.setTextColor(0);
  yPosition += 12;

  // Divider line
  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  const addSection = (title: string, content: string | null | undefined) => {
    if (!content) return;
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 128); // Teal color
    doc.text(title, margin, yPosition);
    yPosition += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);

    const lines = doc.splitTextToSize(content, contentWidth);
    lines.forEach((line: string) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 8;
  };

  const addSectionHeader = (title: string) => {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(title, margin, yPosition);
    yPosition += 10;
  };

  // Profile Information Section
  addSectionHeader("Profile Information");
  
  if (data.bio) {
    addSection("Bio", data.bio);
  }
  
  if (data.primarySkills) {
    addSection("Primary Skills", data.primarySkills);
  }
  
  if (data.yearsOfExperience !== null && data.yearsOfExperience !== undefined) {
    addSection("Years of Experience", `${data.yearsOfExperience} years`);
  }

  // Natural Role Section
  if (data.description) {
    addSectionHeader("Natural Role Definition");
    addSection("Role Description", data.description);
  }

  // Promise Section
  if (data.promiseCheck !== undefined) {
    addSectionHeader("Promise Commitment");
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(`Promise: ${data.promiseCheck ? "Yes" : "No"}`, margin, yPosition);
    yPosition += 12;
  }

  // Practice Section
  if (data.practiceCheck && data.promiseCheck) {
    addSectionHeader("Practice Experience");
    
    if (data.practiceEntities) {
      addSection("Entities Worked With", data.practiceEntities);
    }
    
    if (data.practiceCaseStudies !== null && data.practiceCaseStudies !== undefined) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      doc.text(`Case Studies: ${data.practiceCaseStudies}`, margin, yPosition);
      yPosition += 12;
    }
  }

  // Training Section
  if (data.trainingCheck && data.promiseCheck) {
    addSectionHeader("Training Experience");
    
    if (data.trainingContexts) {
      addSection("Training Contexts", data.trainingContexts);
    }
    
    if (data.trainingCount !== null && data.trainingCount !== undefined) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      doc.text(`People Trained: ${data.trainingCount}`, margin, yPosition);
      yPosition += 12;
    }
  }

  // Consulting Section
  if (data.consultingCheck && data.promiseCheck) {
    addSectionHeader("Consulting Experience");
    
    if (data.consultingWithWhom) {
      addSection("Consulting With", data.consultingWithWhom);
    }
    
    if (data.consultingCaseStudies) {
      addSection("Case Studies", data.consultingCaseStudies);
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  // Download the PDF
  const fileName = data.userName 
    ? `resume-${data.userName.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "resume.pdf";
  
  doc.save(fileName);
}
