import { GIFT_TIERS, getGiftForFundingRequest } from "@/lib/gift-from-funding";

describe("gift-from-funding", () => {
  describe("getGiftForFundingRequest", () => {
    it("returns first tier for zero or empty", () => {
      expect(getGiftForFundingRequest("").label).toContain("Fund $20k+");
      expect(getGiftForFundingRequest("0").label).toContain("Fund $20k+");
    });

    it("returns AirPods tier for 20k–99k", () => {
      expect(getGiftForFundingRequest("20000").label).toBe("AirPods Pro 3 earbuds");
      expect(getGiftForFundingRequest("50000").label).toBe("AirPods Pro 3 earbuds");
      expect(getGiftForFundingRequest("$75,000").label).toBe("AirPods Pro 3 earbuds");
    });

    it("returns iPad Air for 100k–149k", () => {
      expect(getGiftForFundingRequest("100000").label).toBe("iPad Air");
      expect(getGiftForFundingRequest("120000").label).toBe("iPad Air");
    });

    it("returns iPhone 17 for 150k–249k", () => {
      expect(getGiftForFundingRequest("150000").label).toBe("iPhone 17");
      expect(getGiftForFundingRequest("200000").label).toBe("iPhone 17");
    });

    it("returns MacBook Air for 250k–499k", () => {
      expect(getGiftForFundingRequest("250000").label).toBe("Apple MacBook Air");
      expect(getGiftForFundingRequest("400000").label).toBe("Apple MacBook Air");
    });

    it("returns Travel rewards for 500k+", () => {
      expect(getGiftForFundingRequest("500000").label).toContain("Travel rewards");
      expect(getGiftForFundingRequest("1000000").label).toContain("Travel rewards");
    });
  });

  describe("GIFT_TIERS", () => {
    it("has ascending minAmount", () => {
      for (let i = 1; i < GIFT_TIERS.length; i++) {
        expect(GIFT_TIERS[i].minAmount).toBeGreaterThanOrEqual(GIFT_TIERS[i - 1].minAmount);
      }
    });
  });
});
