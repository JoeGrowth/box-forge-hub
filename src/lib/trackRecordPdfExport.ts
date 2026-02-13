import jsPDF from "jspdf";

interface TrackRecordData {
  userName?: string;
  hasProject: boolean | null;
  projectDescription: string | null;
  projectCount: number | null;
  projectRole: string | null;
  projectOutcome: string | null;
  hasProduct: boolean | null;
  productDescription: string | null;
  productCount: number | null;
  productStage: string | null;
  productUsersCount: string | null;
  hasTeam: boolean | null;
  teamDescription: string | null;
  teamSize: number | null;
  teamRole: string | null;
  hasBusiness: boolean | null;
  businessDescription: string | null;
  businessCount: number | null;
  businessRevenue: string | null;
  businessDuration: string | null;
  hasBoard: boolean | null;
  boardDescription: string | null;
  boardCount: number | null;
  boardRoleType: string | null;
  boardEquityDetails: string | null;
}

const roleLabels: Record<string, string> = {
  founder: "Founder / Initiator",
  "co-founder": "Co-Founder",
  project_lead: "Project Lead",
  core_contributor: "Core Contributor",
};

const stageLabels: Record<string, string> = {
  idea: "Idea / Concept",
  prototype: "Prototype / PoC",
  mvp: "MVP",
  launched: "Launched / Live",
  revenue: "Revenue-Generating",
};

const teamRoleLabels: Record<string, string> = {
  team_lead: "Team Lead / Manager",
  cto_coo: "CTO / COO / C-Level",
  "co-founder": "Co-Founder",
  key_member: "Key Team Member",
  advisor: "Advisor / Mentor",
};

const equityLabels: Record<string, string> = {
  board_member: "Board Member",
  advisor: "Advisor / Mentor",
  angel_investor: "Angel Investor",
  equity_partner: "Equity Partner / Co-Founder",
  pro_bono: "Pro Bono / Value Contributor",
};

export function exportTrackRecordToPdf(data: TrackRecordData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 20;

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Entrepreneurial Track Record", pageWidth / 2, yPosition, { align: "center" });
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

  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  const checkPage = (needed: number = 20) => {
    if (yPosition > 280 - needed) {
      doc.addPage();
      yPosition = 20;
    }
  };

  const addSectionHeader = (title: string) => {
    checkPage(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(title, margin, yPosition);
    yPosition += 10;
  };

  const addField = (label: string, value: string | null | undefined) => {
    if (!value) return;
    checkPage();
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 128);
    doc.text(label, margin, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(value, contentWidth);
    lines.forEach((line: string) => {
      checkPage();
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 4;
  };

  const addStatus = (has: boolean | null) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(`Status: ${has === true ? "✓ Has Experience" : "No Experience"}`, margin, yPosition);
    yPosition += 8;
  };

  // 1. Initiatives & Projects
  addSectionHeader("Initiatives & Projects");
  addStatus(data.hasProject);
  if (data.hasProject) {
    addField("Description", data.projectDescription);
    if (data.projectCount) addField("Count", `${data.projectCount} initiative(s)`);
    if (data.projectRole) addField("Role", roleLabels[data.projectRole] || data.projectRole);
    addField("Measurable Outcomes", data.projectOutcome);
  }

  // 2. Products & Prototypes
  addSectionHeader("Products & Prototypes");
  addStatus(data.hasProduct);
  if (data.hasProduct) {
    addField("Description", data.productDescription);
    if (data.productCount) addField("Count", `${data.productCount} product(s)`);
    if (data.productStage) addField("Furthest Stage", stageLabels[data.productStage] || data.productStage);
    addField("Users/Customers Reached", data.productUsersCount);
  }

  // 3. Team Experience
  addSectionHeader("Team Experience");
  addStatus(data.hasTeam);
  if (data.hasTeam) {
    addField("Description", data.teamDescription);
    if (data.teamSize) addField("Team Size", `${data.teamSize} member(s)`);
    if (data.teamRole) addField("Role", teamRoleLabels[data.teamRole] || data.teamRole);
  }

  // 4. Business & Commercial
  addSectionHeader("Business & Commercial");
  addStatus(data.hasBusiness);
  if (data.hasBusiness) {
    addField("Description", data.businessDescription);
    if (data.businessCount) addField("Count", `${data.businessCount} business(es)`);
    addField("Revenue / Impact", data.businessRevenue);
    addField("Duration", data.businessDuration);
  }

  // 5. Equity & Value Contributions
  addSectionHeader("Equity & Value Contributions");
  addStatus(data.hasBoard);
  if (data.hasBoard) {
    addField("Description", data.boardDescription);
    if (data.boardCount) addField("Count", `${data.boardCount} contribution(s)`);
    if (data.boardRoleType) addField("Type", equityLabels[data.boardRoleType] || data.boardRoleType);
    addField("Value Details", data.boardEquityDetails);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  const fileName = data.userName
    ? `track-record-${data.userName.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "track-record.pdf";

  doc.save(fileName);
}
