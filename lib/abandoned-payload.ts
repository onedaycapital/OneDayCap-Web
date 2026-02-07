/** Serializable form state for abandoned progress (no FileList). Shared by client and server. */
export type AbandonedPayload = {
  step: number;
  personal: { firstName: string; lastName: string; email: string; phone: string; smsConsent: boolean };
  business: Record<string, string>;
  financial: Record<string, string>;
  creditOwnership: Record<string, string>;
  signature: { signatureDataUrl: string | null; signedAt: string | null; auditId: string | null };
};

/** Build payload from form state (omits documents). */
export function buildAbandonedPayload(
  step: number,
  personal: AbandonedPayload["personal"],
  business: AbandonedPayload["business"],
  financial: AbandonedPayload["financial"],
  creditOwnership: AbandonedPayload["creditOwnership"],
  signature: AbandonedPayload["signature"]
): AbandonedPayload {
  return { step, personal, business, financial, creditOwnership, signature };
}
