import { getIndustryRisk, INDUSTRY_RISK_MAP, INDUSTRY_OPTIONS } from "@/lib/industry-risk";

describe("industry-risk", () => {
  describe("getIndustryRisk", () => {
    it("returns — for empty or null", () => {
      expect(getIndustryRisk("")).toBe("—");
      expect(getIndustryRisk(null)).toBe("—");
      expect(getIndustryRisk(undefined)).toBe("—");
      expect(getIndustryRisk("   ")).toBe("—");
    });

    it("returns mapped risk for known industry", () => {
      expect(getIndustryRisk("Construction")).toBe("T1-T3");
      expect(getIndustryRisk("Health Care & Social Assistance")).toBe("T1");
      expect(getIndustryRisk("Gambling Industries")).toBe("T4");
    });

    it("trims input", () => {
      expect(getIndustryRisk("  Construction  ")).toBe("T1-T3");
    });

    it("returns — for unknown industry", () => {
      expect(getIndustryRisk("Unknown Industry")).toBe("—");
    });
  });

  describe("INDUSTRY_OPTIONS", () => {
    it("every option has a risk mapping", () => {
      for (const opt of INDUSTRY_OPTIONS) {
        expect(INDUSTRY_RISK_MAP[opt]).toBeDefined();
      }
    });
  });
});
