import jsPDF from "jspdf";

interface JourneyData {
  vision: string;
  problem: string;
  market: string;
  business_model: string;
  roles_needed: string;
  cobuilder_plan: string;
  execution_plan: string;
  userName?: string;
  ideaTitle?: string;
}

export function exportJourneyToPdf(data: JourneyData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Entrepreneur Journey", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  if (data.userName) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`By: ${data.userName}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
  }

  if (data.ideaTitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Startup: ${data.ideaTitle}`, pageWidth / 2, yPosition, { align: "center" });
    doc.setTextColor(0);
    yPosition += 8;
  }

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Divider line
  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  const addSection = (title: string, content: string) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 128); // Teal color
    doc.text(title, margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);

    const lines = doc.splitTextToSize(content || "Not provided", contentWidth);
    lines.forEach((line: string) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 10;
  };

  // Step 1: Vision
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Step 1: Define Your Vision", margin, yPosition);
  yPosition += 12;

  addSection("Vision", data.vision);
  addSection("Problem", data.problem);
  addSection("Target Market", data.market);

  // Step 2: Business Model
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Step 2: Business Model", margin, yPosition);
  yPosition += 12;

  addSection("Business Model", data.business_model);
  addSection("Key Roles Needed", data.roles_needed);

  // Step 3: Co-Builders
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Step 3: Find Co-Builders", margin, yPosition);
  yPosition += 12;

  addSection("Co-Builder Plan", data.cobuilder_plan);

  // Step 4: Execution
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Step 4: Execute", margin, yPosition);
  yPosition += 12;

  addSection("Execution Plan", data.execution_plan);

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  // Download the PDF
  const fileName = data.ideaTitle 
    ? `entrepreneur-journey-${data.ideaTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "entrepreneur-journey.pdf";
  
  doc.save(fileName);
}
