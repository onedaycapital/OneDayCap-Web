/**
 * Customer Reward Program: map funding request amount to free gift (used on apply step 1/5 and processing-application page).
 */

/** Customer Reward Program tiers (match landing page): funding threshold → free gift. First reward at $20k. */
export const GIFT_TIERS: { minAmount: number; label: string }[] = [
  { minAmount: 0, label: "Fund $20k+ to receive AirPods Pro 3 earbuds" },
  { minAmount: 20_000, label: "AirPods Pro 3 earbuds" },
  { minAmount: 100_000, label: "iPad Air" },
  { minAmount: 150_000, label: "iPhone 17" },
  { minAmount: 250_000, label: "Apple MacBook Air" },
  { minAmount: 500_000, label: "Travel rewards (up to $5,000 value)" },
];

/** Get gift label for a funding request (digits-only string or number). */
export function getGiftForFundingRequest(fundingRequestDigits: string): { label: string } {
  const num = fundingRequestDigits ? parseInt(String(fundingRequestDigits).replace(/\D/g, ""), 10) : 0;
  const validNum = !Number.isNaN(num) && num > 0 ? num : 0;
  let match = GIFT_TIERS[0];
  for (const tier of GIFT_TIERS) {
    if (validNum >= tier.minAmount) match = tier;
  }
  return { label: match.label };
}
