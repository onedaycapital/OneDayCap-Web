import type { ApplicationFormData } from "./types";
import { getDigits } from "./formatters";

export function validateStep1(personal: ApplicationFormData["personal"]): string | null {
  const email = (personal.email || "").trim();
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  return null;
}

export function validateStep2(business: ApplicationFormData["business"]): string | null {
  if (!(business.typeOfBusiness || "").trim()) return "Type of Business is required.";
  const startDate = (business.startDateOfBusiness || "").trim();
  if (!startDate) return "Start Date of Business is required.";
  if (!/^[A-Za-z]+,\s*\d{4}$/.test(startDate)) return "Please select both month and year for Start Date of Business.";
  const einDigits = getDigits(business.ein || "");
  if (einDigits.length !== 9) return "EIN must be exactly 9 digits.";
  if (!(business.businessName || "").trim()) return "Business Name is required.";
  if (!(business.address || "").trim()) return "Address is required.";
  if (!(business.city || "").trim()) return "City is required.";
  if (!(business.state || "").trim()) return "State is required.";
  if (!(business.zip || "").trim()) return "ZIP is required.";
  if (!(business.industry || "").trim()) return "Industry is required.";
  return null;
}

export function validateStep3(financial: ApplicationFormData["financial"]): string | null {
  if (!(financial.monthlyRevenue || "").trim()) return "Monthly Revenues (Approximate) is required.";
  if (!(financial.fundingRequest || "").trim()) return "Funding Request is required.";
  if (!(financial.useOfFunds || "").trim()) return "Use of Funds is required.";
  return null;
}

export function validateStep4(
  personal: ApplicationFormData["personal"],
  creditOwnership: ApplicationFormData["creditOwnership"]
): string | null {
  if (!(personal.firstName || "").trim()) return "First Name is required.";
  if (!(personal.lastName || "").trim()) return "Last Name is required.";
  if (!(personal.phone || "").trim()) return "Phone is required.";
  const ssnDigits = getDigits(creditOwnership.ssn || "");
  if (ssnDigits.length !== 9) return "SSN must be exactly 9 digits.";
  return null;
}

export function validateStep5(
  _documents: ApplicationFormData["documents"],
  signature: ApplicationFormData["signature"],
  personal: ApplicationFormData["personal"]
): string | null {
  if (!personal.smsConsent) return "You must agree to the terms and consents above before signing.";
  if (!(signature.signatureDataUrl || "").trim()) return "Signature is required.";
  return null;
}
