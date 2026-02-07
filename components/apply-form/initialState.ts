import type { ApplicationFormData } from "./types";

export const initialFormState: ApplicationFormData = {
  step: 1,
  personal: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    smsConsent: false,
  },
  business: {
    businessName: "",
    dba: "",
    typeOfBusiness: "",
    startDateOfBusiness: "",
    ein: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    industry: "",
  },
  financial: {
    monthlyRevenue: "",
    fundingRequest: "",
    useOfFunds: "",
  },
  creditOwnership: {
    ssn: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    ownershipPercent: "",
  },
  documents: {
    bankStatements: null,
    voidCheck: null,
    driversLicense: null,
  },
  signature: {
    signatureDataUrl: null,
    signedAt: null,
    auditId: null,
  },
};

export const STEP_SECTIONS: { id: 1 | 2 | 3 | 4 | 5; title: string; subtitle: string }[] = [
  { id: 1, title: "Email", subtitle: "We'll look up your details" },
  { id: 2, title: "Business Information", subtitle: "Your business details" },
  { id: 3, title: "Financial & Funding", subtitle: "Funding and revenue" },
  { id: 4, title: "Credit & Ownership", subtitle: "Contact & ownership details" },
  { id: 5, title: "Documents & Agreement", subtitle: "Upload, terms & sign" },
];
