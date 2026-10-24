import { describe, it, expect } from "vitest";
import { getEntityLabel, isCertificateDoc } from "./entityLabels";

describe("entity legal-form labels", () => {
  it("certificate of incorporation always means Corporated Partnership", () => {
    expect(getEntityLabel({ hasCertificate: true, memberCount: 1 })).toBe("Corporated Partnership");
    expect(getEntityLabel({ hasCertificate: true, memberCount: 7 })).toBe("Corporated Partnership");
  });
  it("no certificate with 1 member is Sole Proprietorship", () => {
    expect(getEntityLabel({ hasCertificate: false, memberCount: 1 })).toBe("Sole Proprietorship");
  });
  it("no certificate with 2 members is Unincorporated Partnership", () => {
    expect(getEntityLabel({ hasCertificate: false, memberCount: 2 })).toBe("Unincorporated Partnership");
  });
  it("no certificate with more than 2 members stays Unincorporated Partnership", () => {
    expect(getEntityLabel({ hasCertificate: false, memberCount: 5 })).toBe("Unincorporated Partnership");
  });
  it("detects certificate documents regardless of case or extra wording", () => {
    expect(isCertificateDoc("Certificate of Incorporation.pdf")).toBe(true);
    expect(isCertificateDoc("SCAN - certificate of incorporation final")).toBe(true);
    expect(isCertificateDoc("Pitch Deck.pdf")).toBe(false);
    expect(isCertificateDoc(null)).toBe(false);
  });
});
