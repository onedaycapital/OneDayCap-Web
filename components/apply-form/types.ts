/**
 * Form field types for the merchant application.
 * Used for validation, submission, and later Supabase table shape.
 */

export type StepId = 1 | 2 | 3 | 4 | 5;

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsConsent: boolean;
}

export interface BusinessInfo {
  businessName: string;
  dba: string;
  typeOfBusiness: string;
  startDateOfBusiness: string;
  ein: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  industry: string;
}

export interface FinancialFundingInfo {
  monthlyRevenue: string;
  fundingRequest: string;
  useOfFunds: string;
}

export interface PersonalCreditOwnership {
  ssn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ownershipPercent: string;
}

export interface DocumentUploads {
  bankStatements: FileList | null;
  voidCheck: FileList | null;
  driversLicense: FileList | null;
}

export interface SignatureAudit {
  signatureDataUrl: string | null;
  signedAt: string | null;
  auditId: string | null;
}

export interface ApplicationFormData {
  step: StepId;
  personal: PersonalInfo;
  business: BusinessInfo;
  financial: FinancialFundingInfo;
  creditOwnership: PersonalCreditOwnership;
  documents: DocumentUploads;
  signature: SignatureAudit;
}

export const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.gif,.csv";
export const ACCEPTED_FILE_TYPES_ARR = ["application/pdf", "image/jpeg", "image/jpg", "image/gif", "text/csv"];
