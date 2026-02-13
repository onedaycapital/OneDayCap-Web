import { computePaperClassification } from "@/lib/paper-classifier";

describe("paper-classifier", () => {
  const basePayload = {
    business: {
      industry: "Construction",
      startDateOfBusiness: "Jan, 2022",
    },
    financial: {
      monthlyRevenue: "75000",
      fundingRequest: "50000",
    },
  };

  it("returns industryRiskTier, paperType, and component scores", () => {
    const result = computePaperClassification(basePayload);
    expect(result).toMatchObject({
      industryRiskTier: expect.stringMatching(/^(Low|Medium|High|Very High)$/),
      paperType: expect.stringMatching(/^[ABCD]$/),
    });
    expect(typeof result.paperScore).toBe("number");
    expect(result.tibScore).toBeGreaterThanOrEqual(0);
    expect(result.revenueScore).toBeGreaterThanOrEqual(0);
    expect(result.industryScore).toBeGreaterThanOrEqual(0);
    expect(result.multipleScore).toBeGreaterThanOrEqual(0);
  });

  it("uses numeric monthly revenue for score (50k–100k → 80)", () => {
    const highRevenue = {
      ...basePayload,
      financial: { ...basePayload.financial, monthlyRevenue: "100000", fundingRequest: "50000" },
    };
    const lowRevenue = {
      ...basePayload,
      financial: { ...basePayload.financial, monthlyRevenue: "25000", fundingRequest: "50000" },
    };
    const rHigh = computePaperClassification(highRevenue);
    const rLow = computePaperClassification(lowRevenue);
    expect(rHigh.revenueScore).toBe(100);
    expect(rLow.revenueScore).toBe(40);
  });

  it("accepts legacy range labels for monthly revenue", () => {
    const legacy = {
      ...basePayload,
      financial: { ...basePayload.financial, monthlyRevenue: "50k-100k" },
    };
    const result = computePaperClassification(legacy);
    expect(result.revenueScore).toBe(80);
  });
});
