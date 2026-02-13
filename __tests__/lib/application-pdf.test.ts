import { buildAdditionalDetailsRows, applicationPdfFilename } from "@/lib/application-pdf";

describe("application-pdf", () => {
  const minimalPayload = {
    personal: { firstName: "J", lastName: "D", email: "j@test.com", phone: "", smsConsent: false },
    business: {
      businessName: "Test Co",
      dba: "",
      typeOfBusiness: "llc",
      typeOfBusinessLabel: "LLC",
      startDateOfBusiness: "Jan, 2023",
      ein: "12-3456789",
      address: "",
      city: "",
      state: "NY",
      zip: "",
      industry: "Construction",
    },
    financial: {
      monthlyRevenue: "65000",
      fundingRequest: "75000",
      useOfFunds: "working-capital",
    },
    creditOwnership: { ssn: "", address: "", city: "", state: "", zip: "", ownershipPercent: "" },
    signature: { signatureDataUrl: null, signedAt: null, auditId: null },
    documents: { bankStatements: [], voidCheck: null, driversLicense: null },
  } as Parameters<typeof buildAdditionalDetailsRows>[0];

  describe("buildAdditionalDetailsRows", () => {
    it("returns rows with expected labels", () => {
      const rows = buildAdditionalDetailsRows(minimalPayload);
      const labels = rows.map((r) => r.label);
      expect(labels).toContain("Industry Risk");
      expect(labels).toContain("Paper Type");
      expect(labels).toContain("State");
      expect(labels).toContain("Monthly Revenues (Approximate)");
      expect(labels).toContain("Time in Business");
      expect(labels).toContain("Industry");
    });

    it("formats monthly revenue as currency when numeric", () => {
      const rows = buildAdditionalDetailsRows(minimalPayload);
      const revenueRow = rows.find((r) => r.label === "Monthly Revenues (Approximate)");
      expect(revenueRow?.value).toMatch(/\$[\d,]+/);
    });

    it("uses State from business", () => {
      const rows = buildAdditionalDetailsRows(minimalPayload);
      const stateRow = rows.find((r) => r.label === "State");
      expect(stateRow?.value).toBe("NY");
    });
  });

  describe("applicationPdfFilename", () => {
    it("returns sanitized name with Application suffix", () => {
      expect(applicationPdfFilename("Acme Inc")).toMatch(/Acme.*Application/);
    });
  });
});
