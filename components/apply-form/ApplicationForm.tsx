"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationFormData, StepId } from "./types";
import { initialFormState, STEP_SECTIONS } from "./initialState";
import { Step1PersonalInfo } from "./steps/Step1PersonalInfo";
import { Step2BusinessInfo } from "./steps/Step2BusinessInfo";
import { Step3FinancialFunding } from "./steps/Step3FinancialFunding";
import { Step4PersonalCreditOwnership } from "./steps/Step4PersonalCreditOwnership";
import { Step5DocumentsAndSignature } from "./steps/Step5DocumentsAndSignature";
import { saveApplicationAndPdf, submitDocuments } from "@/app/actions/submit-application";
import { lookupMerchantByEmail } from "@/app/actions/lookup-merchant";
import { getAbandonedProgress, upsertAbandonedProgress } from "@/app/actions/abandoned-progress";
import { sendFundingLeadNotification } from "@/app/actions/send-funding-lead-notification";
import { buildAbandonedPayload } from "@/lib/abandoned-payload";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep4SignOff,
} from "./validation";
import {
  setAnalyticsUserId,
  setAnalyticsUserEmail,
  trackApplicationForm,
  ApplicationFormEvents,
  getCampaignEmail,
} from "@/lib/analytics";
import { sendSessionEvent } from "@/lib/session-event-client";
import { RESUME_EMAIL_KEY, RESUME_STEP_KEY, RESUME_APPLICATION_ID_KEY } from "@/lib/resume-storage";

const TOTAL_STEPS = 5;
const AUTOSAVE_DEBOUNCE_MS = 1800;

function toAbandonedPayload(
  step: number,
  personal: ApplicationFormData["personal"],
  business: ApplicationFormData["business"],
  financial: ApplicationFormData["financial"],
  creditOwnership: ApplicationFormData["creditOwnership"],
  signature: ApplicationFormData["signature"]
) {
  return buildAbandonedPayload(
    step,
    personal,
    business as unknown as Record<string, string>,
    financial as unknown as Record<string, string>,
    creditOwnership as unknown as Record<string, string>,
    signature
  );
}

/** Merge overlay onto base, but only where overlay has a non-empty value (so abandoned blanks don't overwrite Staging). */
function mergeSectionPreferNonEmpty<T extends Record<string, unknown>>(
  base: T,
  overlay: Record<string, unknown>
): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(overlay)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as T;
}

export function ApplicationForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [hadLookupResult, setHadLookupResult] = useState(false);
  const [restoredFromAbandoned, setRestoredFromAbandoned] = useState(false);
  const [savingStep4, setSavingStep4] = useState(false);
  const currentStep = formData.step;

  // Prefill email when user came from a campaign link that included email (?rid=...&email=... or &e=...).
  // Also send apply_landing so we create/update application_sessions immediately — eligible for 30m nudge even if they leave before step_view fires.
  useEffect(() => {
    const campaignEmail = getCampaignEmail();
    if (campaignEmail) {
      setFormData((prev) => ({
        ...prev,
        personal: { ...prev.personal, email: campaignEmail },
      }));
      sendSessionEvent({ email: campaignEmail, event: "apply_landing", step: 1 });
    }
  }, []);

  // Prefill from resume link: /apply/resume?t=... or /apply/documents?t=... stores email, step, and optionally applicationId in sessionStorage
  useEffect(() => {
    try {
      const resumeEmail = sessionStorage.getItem(RESUME_EMAIL_KEY)?.trim();
      const resumeStep = sessionStorage.getItem(RESUME_STEP_KEY);
      const resumeApplicationId = sessionStorage.getItem(RESUME_APPLICATION_ID_KEY)?.trim();
      if (resumeApplicationId) {
        // Documents reminder link: go to step 5 with savedApplicationId
        setFormData((prev) => ({
          ...prev,
          step: 5,
          savedApplicationId: resumeApplicationId,
          ...(resumeEmail ? { personal: { ...prev.personal, email: resumeEmail } } : {}),
        }));
        sessionStorage.removeItem(RESUME_APPLICATION_ID_KEY);
        sessionStorage.removeItem(RESUME_EMAIL_KEY);
        sessionStorage.removeItem(RESUME_STEP_KEY);
      } else if (resumeEmail && resumeStep) {
        const step = Math.min(5, Math.max(1, parseInt(resumeStep, 10) || 1)) as StepId;
        setFormData((prev) => ({
          ...prev,
          step,
          personal: { ...prev.personal, email: resumeEmail },
        }));
        sessionStorage.removeItem(RESUME_EMAIL_KEY);
        sessionStorage.removeItem(RESUME_STEP_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  useEffect(() => {
    if (submitError && submitErrorRef.current) {
      submitErrorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [submitError]);

  // Amplitude: form started (once on mount)
  useEffect(() => {
    const section = STEP_SECTIONS.find((s) => s.id === 1);
    trackApplicationForm(ApplicationFormEvents.FormStarted, { step: 1, step_name: section?.title ?? "Financial and Funding" });
  }, []);

  // Amplitude: set user ID and email property when we have email; track step viewed; backend session-event for nudges
  useEffect(() => {
    const email = formData.personal.email?.trim();
    if (email) {
      setAnalyticsUserEmail(email);
      sendSessionEvent({ email, event: "step_view", step: currentStep });
    }
    const section = STEP_SECTIONS.find((s) => s.id === currentStep);
    trackApplicationForm(ApplicationFormEvents.StepViewed, {
      step: currentStep,
      step_name: section?.title ?? `Step ${currentStep}`,
    });
  }, [currentStep, formData.personal.email]);

  // Amplitude: session ended (abandonment point) when user leaves the page
  useEffect(() => {
    const handleEnd = () => {
      const section = STEP_SECTIONS.find((s) => s.id === currentStep);
      trackApplicationForm(ApplicationFormEvents.SessionEnded, {
        step: currentStep,
        step_name: section?.title ?? `Step ${currentStep}`,
        abandoned_at_step: currentStep,
      });
    };
    window.addEventListener("pagehide", handleEnd);
    window.addEventListener("beforeunload", handleEnd);
    return () => {
      window.removeEventListener("pagehide", handleEnd);
      window.removeEventListener("beforeunload", handleEnd);
    };
  }, [currentStep]);

  // Autosave progress (abandoned form) when user has entered email; debounced
  useEffect(() => {
    const email = formData.personal.email?.trim();
    if (!email) return;
    const t = setTimeout(() => {
      const payload = toAbandonedPayload(
        formData.step,
        formData.personal,
        formData.business,
        formData.financial,
        formData.creditOwnership,
        formData.signature
      );
      upsertAbandonedProgress(email, formData.step, payload);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [formData]);

  const setStep = useCallback((step: StepId) => {
    setFormData((prev) => ({ ...prev, step }));
  }, []);

  const goNext = useCallback(async () => {
    setStepError(null);
    if (currentStep >= TOTAL_STEPS) return;
    const nextStep = (currentStep + 1) as StepId;
    const section = STEP_SECTIONS.find((s) => s.id === currentStep);
    const stepName = section?.title ?? `Step ${currentStep}`;

    // Step 1: Financial and Funding — validate, notify subs@, then advance
    if (currentStep === 1) {
      const err = validateStep3(formData.financial);
      if (err) {
        setStepError(err);
        trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 1, step_name: stepName, validation_error: err });
        return;
      }
      sendFundingLeadNotification({ email: formData.personal.email || null, financial: formData.financial }).catch(() => {});
      const email = formData.personal.email?.trim();
      if (email) sendSessionEvent({ email, event: "step_complete", step: 1 });
      trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 1, to_step: 2, step_name: stepName });
      setStep(2);
      return;
    }

    // Step 2: Email — validate, lookup/restore/welcome back, then advance
    if (currentStep === 2) {
      const err = validateStep1(formData.personal);
      if (err) {
        setStepError(err);
        trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 2, step_name: stepName, validation_error: err });
        return;
      }
      const email = formData.personal.email.trim();
      setLookingUp(true);
      try {
        const [abandoned, stagingResult] = await Promise.all([
          getAbandonedProgress(email),
          lookupMerchantByEmail(email),
        ]);
        const hasAbandoned = abandoned.found;
        // Only "restore" when they had reached step 3+ before (avoid restoring to step 2 when autosave has lastStep 2)
        const hasMeaningfulAbandoned = hasAbandoned && abandoned.lastStep >= 3;
        const hasStaging = stagingResult.found;
        const WELCOME_BACK_MIN_AGE_MS = 2 * 60 * 1000;
        const savedLongAgo = hasMeaningfulAbandoned && (Date.now() - new Date(abandoned.updatedAt).getTime() >= WELCOME_BACK_MIN_AGE_MS);

        if (hasMeaningfulAbandoned) {
          setAnalyticsUserEmail(email);
          const stepToRestore = abandoned.lastStep;
          if (savedLongAgo) {
            trackApplicationForm(ApplicationFormEvents.RestoredFromAbandoned, { restored_to_step: stepToRestore, previous_last_step: abandoned.lastStep });
            setRestoredFromAbandoned(true);
          }
          setHadLookupResult(hasStaging);
          const abandonedPayload = abandoned.payload;
          const staging = hasStaging ? stagingResult : null;
          const basePersonal = { ...formData.personal, ...(staging?.personal ?? {}) } as Record<string, unknown>;
          const baseBusiness = { ...formData.business, ...(staging?.business ?? {}) } as Record<string, unknown>;
          const baseFinancial = { ...formData.financial, ...(staging?.financial ?? {}) } as Record<string, unknown>;
          const baseCredit = { ...formData.creditOwnership, ...(staging?.creditOwnership ?? {}) } as Record<string, unknown>;
          const mergedPersonal = mergeSectionPreferNonEmpty(basePersonal, abandonedPayload.personal as Record<string, unknown>) as unknown as ApplicationFormData["personal"];
          const mergedBusiness = mergeSectionPreferNonEmpty(baseBusiness, abandonedPayload.business as Record<string, unknown>) as unknown as ApplicationFormData["business"];
          const mergedFinancial = mergeSectionPreferNonEmpty(baseFinancial, abandonedPayload.financial as Record<string, unknown>) as unknown as ApplicationFormData["financial"];
          const mergedCredit = mergeSectionPreferNonEmpty(baseCredit, abandonedPayload.creditOwnership as Record<string, unknown>) as unknown as ApplicationFormData["creditOwnership"];
          setFormData({
            step: stepToRestore as StepId,
            personal: mergedPersonal,
            business: mergedBusiness,
            financial: mergedFinancial,
            creditOwnership: mergedCredit,
            documents: initialFormState.documents,
            signature: abandonedPayload.signature,
          });
          setLookingUp(false);
          return;
        }
        if (hasAbandoned && abandoned.lastStep <= 1) {
          setAnalyticsUserEmail(email);
          sendSessionEvent({ email, event: "step_complete", step: 2 });
          trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 2, to_step: 3, step_name: stepName, lookup_source: "abandoned_step1_only" });
          await upsertAbandonedProgress(
            email,
            3,
            toAbandonedPayload(3, formData.personal, formData.business, formData.financial, formData.creditOwnership, formData.signature)
          );
          setStep(3);
          setLookingUp(false);
          return;
        }
        if (hasStaging) {
          setHadLookupResult(true);
          setAnalyticsUserEmail(email);
          sendSessionEvent({ email, event: "step_complete", step: 2 });
          trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 2, to_step: 3, step_name: stepName, lookup_source: "staging" });
          const merged = {
            ...formData,
            step: 3 as StepId,
            personal: { ...formData.personal, ...stagingResult.personal },
            business: { ...formData.business, ...stagingResult.business },
            financial: { ...formData.financial, ...stagingResult.financial },
            creditOwnership: { ...formData.creditOwnership, ...stagingResult.creditOwnership },
          };
          setFormData(merged);
          await upsertAbandonedProgress(
            email,
            3,
            toAbandonedPayload(3, merged.personal, merged.business, merged.financial, merged.creditOwnership, merged.signature)
          );
          setStep(3);
        } else {
          setAnalyticsUserEmail(email);
          sendSessionEvent({ email, event: "step_complete", step: 2 });
          trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 2, to_step: 3, step_name: stepName, lookup_source: "none" });
          await upsertAbandonedProgress(
            email,
            3,
            toAbandonedPayload(3, formData.personal, formData.business, formData.financial, formData.creditOwnership, formData.signature)
          );
          setStep(3);
        }
      } catch {
        setStep(3);
      } finally {
        setLookingUp(false);
      }
      return;
    }

    // Steps 3, 4: validate by section (Business, Credit & Ownership)
    if (currentStep === 3) {
      const err = validateStep2(formData.business);
      if (err) {
        setStepError(err);
        trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 3, step_name: stepName, validation_error: err });
        return;
      }
    }
    if (currentStep === 4) {
      const err = validateStep4(formData.personal, formData.creditOwnership);
      if (err) {
        setStepError(err);
        trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 4, step_name: stepName, validation_error: err });
        return;
      }
    }
    const email = formData.personal.email.trim();
    if (email) sendSessionEvent({ email, event: "step_complete", step: nextStep });
    trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: currentStep, to_step: nextStep, step_name: stepName });
    if (email) {
      const payload = toAbandonedPayload(nextStep, formData.personal, formData.business, formData.financial, formData.creditOwnership, formData.signature);
      await upsertAbandonedProgress(email, nextStep, payload);
    }
    setStep(nextStep);
  }, [currentStep, formData.personal, formData.business, formData.financial, formData.creditOwnership, formData.signature, setStep]);

  const goPrev = useCallback(() => {
    setStepError(null);
    if (currentStep > 1) setStep((currentStep - 1) as StepId);
  }, [currentStep, setStep]);

  /** Step 4: validate, save application + PDF, then go to step 5. */
  const handleSaveAndNext = useCallback(async () => {
    setSubmitError(null);
    setStepError(null);
    const step4Err = validateStep4(formData.personal, formData.creditOwnership);
    if (step4Err) {
      setStepError(step4Err);
      trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 4, step_name: "Owner & Signatures", validation_error: step4Err });
      return;
    }
    const signOffErr = validateStep4SignOff(formData.signature, formData.personal);
    if (signOffErr) {
      setStepError(signOffErr);
      trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 4, step_name: "Owner & Signatures", validation_error: signOffErr });
      return;
    }
    if (savingStep4) return;
    setSavingStep4(true);
    try {
      const payload = {
        personal: formData.personal,
        business: formData.business,
        financial: formData.financial,
        creditOwnership: formData.creditOwnership,
        signature: formData.signature,
        documents: formData.documents,
      };
      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      const result = await saveApplicationAndPdf(fd);
      if (result.success) {
        setFormData((prev) => ({ ...prev, savedApplicationId: result.applicationId }));
        const email = formData.personal.email.trim();
        if (email) sendSessionEvent({ email, event: "step_complete", step: 5 });
        trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 4, to_step: 5, step_name: "Owner & Signatures" });
        if (email) {
          const abandonedPayload = toAbandonedPayload(5, formData.personal, formData.business, formData.financial, formData.creditOwnership, formData.signature);
          await upsertAbandonedProgress(email, 5, abandonedPayload);
        }
        setStep(5);
      } else {
        setStepError(result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save. Please try again.";
      setStepError(msg);
    } finally {
      setSavingStep4(false);
    }
  }, [formData, savingStep4]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentStep !== 5) return;
      setSubmitError(null);
      setStepError(null);
      if (!formData.savedApplicationId) {
        setSubmitError("Please complete Step 4 (Sign & Conclude) first. Go back and click Save & Next.");
        return;
      }
      if (submitting) return;
      setSubmitting(true);
      try {
        const payload = {
          personal: formData.personal,
          business: formData.business,
          financial: formData.financial,
          creditOwnership: formData.creditOwnership,
          signature: formData.signature,
          documents: formData.documents,
          savedApplicationId: formData.savedApplicationId,
        };
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload));
        const result = await submitDocuments(fd);
        if (result.success) {
          const email = formData.personal.email?.trim();
          if (email) sendSessionEvent({ email, event: "submit", step: 5, application_id: result.applicationId });
          trackApplicationForm(ApplicationFormEvents.FormSubmitted, { application_id: result.applicationId, step: 5, step_name: "Upload Documents" });
          if (result.additionalDetails || result.pdfBase64) {
            const safeName =
              (formData.business.businessName || "Application").replace(/[^a-zA-Z0-9\s.-]/g, "").trim() || "Application";
            const filename = `${safeName}_OneDayCap_Application.pdf`;
            try {
              sessionStorage.setItem(
                "application_pdf_download",
                JSON.stringify({
                  base64: result.pdfBase64 ?? null,
                  filename,
                  additionalDetails: result.additionalDetails ?? null,
                  fundingRequest: formData.financial.fundingRequest ?? null,
                })
              );
            } catch {
              // ignore
            }
          }
          router.push("/processing-application");
          return;
        } else {
          trackApplicationForm(ApplicationFormEvents.FormSubmitFailed, { error: result.error, step_name: "Upload Documents" });
          setSubmitError(result.error);
        }
      } catch (actionErr) {
        const msg = actionErr instanceof Error ? actionErr.message : String(actionErr);
        setSubmitError(msg || "Submission failed. Please try again or contact subs@onedaycap.com.");
      } finally {
        setSubmitting(false);
      }
    },
    [currentStep, formData, submitting]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] pt-24 md:pt-28">
      <div className="relative overflow-hidden bg-slate-800 px-6 py-8 md:py-10">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('/images/bull-hero.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(2px)",
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-4xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-white md:text-3xl">
            Apply Now!
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">
            With loans closed in as little as 24 hours, you can get the funds you need for working
            capital, equipment, inventory and more. Our experienced team and seamless process
            reduces the time it takes to fund your loan.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:w-72 lg:border-b-0 lg:border-r">
          <nav className="flex overflow-x-auto lg:flex-col lg:overflow-visible lg:py-8">
            {STEP_SECTIONS.map((section) => {
              const isActive = currentStep === section.id;
              const isPast = currentStep > section.id;
              return (
                <div
                  key={section.id}
                  className="flex shrink-0 items-start gap-3 border-slate-100 px-6 py-4 lg:border-l-4 lg:border-l-transparent lg:px-8 lg:py-3"
                  style={
                    isActive
                      ? { borderLeftColor: "var(--brand-blue)" }
                      : undefined
                  }
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${
                      isActive || isPast
                        ? "bg-[var(--brand-blue)]"
                        : "bg-slate-200"
                    }`}
                  >
                    {isPast ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="font-semibold">{section.id}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`font-medium ${
                        isActive ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {section.title}
                    </p>
                    <p className="text-xs text-slate-400">{section.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm font-medium text-slate-600">
              Step {currentStep}/{TOTAL_STEPS}
            </p>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full bg-slate-200"
                  style={{
                    backgroundColor:
                      i + 1 <= currentStep
                        ? "var(--brand-blue)"
                        : undefined,
                  }}
                />
              ))}
            </div>

            <div className="mt-6 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3">
              <svg
                className="h-5 w-5 shrink-0 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div>
                <p className="font-semibold text-emerald-800">Your Data Is Safe With Us</p>
                <p className="text-sm text-emerald-700">
                  Your privacy is our priority. We never sell your data to third parties.
                </p>
              </div>
            </div>

            {restoredFromAbandoned && (
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
                <p className="font-medium">Welcome back</p>
                <p className="mt-1 text-emerald-800">We&apos;ve restored your previous progress. You&apos;ll go through each step in order with your data prefilled—review and click Next to continue.</p>
              </div>
            )}
            {stepError && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
                {stepError}
              </div>
            )}
            {submitError && (
              <div ref={submitErrorRef} className="mt-6 rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-sm text-red-900 shadow-sm" role="alert">
                <p className="font-semibold">Submission failed</p>
                <p className="mt-2 text-red-800">{submitError}</p>
                <p className="mt-2 text-xs text-red-700">Check your connection and try again. If this persists, contact subs@onedaycap.com with the message above.</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-8" data-form-version="step4-save-next-step5-submit-docs">
              <div className="min-h-[320px]">
                {currentStep === 1 && (
                  <Step3FinancialFunding
                    data={formData.financial}
                    onChange={(financial) =>
                      setFormData((prev) => ({ ...prev, financial }))
                    }
                    highlightEmpty={hadLookupResult}
                  />
                )}
                {currentStep === 2 && (
                  <Step1PersonalInfo
                    data={formData.personal}
                    onChange={(personal) =>
                      setFormData((prev) => ({ ...prev, personal }))
                    }
                  />
                )}
                {currentStep === 3 && (
                  <Step2BusinessInfo
                    data={formData.business}
                    onChange={(business) =>
                      setFormData((prev) => ({ ...prev, business }))
                    }
                    highlightEmpty={hadLookupResult}
                  />
                )}
                {currentStep === 4 && (
                  <Step4PersonalCreditOwnership
                    data={formData.creditOwnership}
                    onChange={(creditOwnership) =>
                      setFormData((prev) => ({ ...prev, creditOwnership }))
                    }
                    personal={formData.personal}
                    onPersonalChange={(personal) =>
                      setFormData((prev) => ({ ...prev, personal }))
                    }
                    signature={formData.signature}
                    onSignatureChange={(signature) =>
                      setFormData((prev) => ({ ...prev, signature }))
                    }
                    highlightEmpty={hadLookupResult}
                  />
                )}
                {currentStep === 5 && (
                  <Step5DocumentsAndSignature
                    documents={formData.documents}
                    onDocumentsChange={(documents) =>
                      setFormData((prev) => ({ ...prev, documents }))
                    }
                  />
                )}
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-8">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2"
                    >
                      Back
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => goNext()}
                      disabled={lookingUp}
                      className="rounded-lg bg-[var(--brand-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {lookingUp ? "Looking up your details…" : "Next"}
                    </button>
                  ) : currentStep === 4 ? (
                    <button
                      type="button"
                      onClick={handleSaveAndNext}
                      disabled={savingStep4}
                      className="rounded-lg bg-[var(--brand-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {savingStep4 ? "Saving…" : "Save & Next"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-[var(--brand-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting…" : "Submit Documents"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
