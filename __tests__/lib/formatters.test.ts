import {
  getDigits,
  formatEIN,
  formatSSN,
  einDigitCount,
  ssnDigitCount,
  parseFundingRequest,
  formatFundingRequestCurrency,
} from "@/components/apply-form/formatters";

describe("formatters", () => {
  describe("getDigits", () => {
    it("strips non-digits", () => {
      expect(getDigits("12-345-6789")).toBe("123456789");
      expect(getDigits("12 34 56")).toBe("123456");
      expect(getDigits("abc123def")).toBe("123");
    });
  });

  describe("formatEIN", () => {
    it("formats 9 digits as xx-xxxxxxx", () => {
      expect(formatEIN("123456789")).toBe("12-3456789");
      expect(formatEIN("12-3456789")).toBe("12-3456789");
    });
    it("returns partial digits when fewer than 3", () => {
      expect(formatEIN("12")).toBe("12");
    });
  });

  describe("formatSSN", () => {
    it("formats 9 digits as xxx-xx-xxxx", () => {
      expect(formatSSN("123456789")).toBe("123-45-6789");
      expect(formatSSN("123-45-6789")).toBe("123-45-6789");
    });
    it("returns partial when 3 or 5 digits", () => {
      expect(formatSSN("123")).toBe("123");
      expect(formatSSN("12345")).toBe("123-45");
    });
  });

  describe("einDigitCount / ssnDigitCount", () => {
    it("counts digits only", () => {
      expect(einDigitCount("12-3456789")).toBe(9);
      expect(ssnDigitCount("123-45-6789")).toBe(9);
    });
  });

  describe("parseFundingRequest", () => {
    it("returns digits only", () => {
      expect(parseFundingRequest("$75,000")).toBe("75000");
      expect(parseFundingRequest("75000")).toBe("75000");
      expect(parseFundingRequest("")).toBe("");
      expect(parseFundingRequest(null)).toBe("");
    });
  });

  describe("formatFundingRequestCurrency", () => {
    it("formats as USD with 0 decimals", () => {
      expect(formatFundingRequestCurrency("75000")).toBe("$75,000");
      expect(formatFundingRequestCurrency("$75,000")).toBe("$75,000");
    });
    it("returns empty string for empty or invalid", () => {
      expect(formatFundingRequestCurrency("")).toBe("");
      expect(formatFundingRequestCurrency(null)).toBe("");
    });
  });
});
