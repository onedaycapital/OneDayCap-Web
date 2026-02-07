"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationFormData, StepId } from "./types";
import { initialFormState, STEP_SECTIONS } from "./initialState";
import { Step1PersonalInfo } from "./steps/Step1PersonalInfo";
import { Step2BusinessInfo } from "./steps/Step2BusinessInfo";
import { Step3FinancialFunding } from "./steps/Step3FinancialFunding";
import { Step4PersonalCreditOwnership } from "./steps/Step4PersonalCreditOwnership";
import { Step5DocumentsAndSignature } from "./steps/Step5DocumentsAndSignature";
import { submitApplication } from "@/app/actions/submit-application";
import { lookupMerchantByEmail } from "@/app/actions/lookup-merchant";
import { getAbandonedProgress, upsertAbandonedProgress } from "@/app/actions/abandoned-progress";
import { buildAbandonedPayload } from "@/lib/abandoned-payload";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
} from "./validation";
import {
  setAnalyticsUserId,
  trackApplicationForm,
  ApplicationFormEvents,
  getCampaignEmail,
} from "@/lib/analytics";

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
  return buildAbandonedPayload(step, personal, business, financial, creditOwnership, signature);
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
  const [lookupDebug, setLookupDebug] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [hadLookupResult, setHadLookupResult] = useState(false);
  const [restoredFromAbandoned, setRestoredFromAbandoned] = useState(false);
  const currentStep = formData.step;

  // Prefill email when user came from a campaign link that included email (?rid=...&email=... or &e=...)
  useEffect(() => {
    const campaignEmail = getCampaignEmail();
    if (campaignEmail) {
      setFormData((prev) => ({
        ...prev,
        personal: { ...prev.personal, email: campaignEmail },
      }));
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // Amplitude: form started (once on mount)
  useEffect(() => {
    trackApplicationForm(ApplicationFormEvents.FormStarted, { step: 1, step_name: "Email" });
  }, []);

  // Amplitude: set user ID when we have email; track step viewed when step changes
  useEffect(() => {
    const email = formData.personal.email?.trim();
    if (email) setAnalyticsUserId(email);
    const section = STEP_SECTIONS.find((s) => s.id === currentStep);
    trackApplicationForm(ApplicationFormEvents.StepViewed, {
      step: currentStep,
      step_name: section?.title ?? `Step ${currentStep}`,
    });
  }, [currentStep]);

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

    if (currentStep === 1) {
      const err = validateStep1(formData.personal);
      if (err) {
        setStepError(err);
        trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 1, step_name: "Email", validation_error: err });
        return;
      }
      const email = formData.personal.email.trim();
      if (email) {
        setLookingUp(true);
        setLookupDebug(null);
        try {
          // Fetch both: we want the complete dataset (Staging + abandoned)
          const [abandoned, stagingResult] = await Promise.all([
            getAbandonedProgress(email),
            lookupMerchantByEmail(email),
          ]);

          const hasAbandoned = abandoned.found;
          const hasStaging = stagingResult.found;

          if (hasAbandoned) {
            setAnalyticsUserId(email);
            // When they click Next on step 1, always go to at least step 2 (abandoned.lastStep can be 1 from autosave)
            const stepToRestore = abandoned.lastStep <= 1 ? nextStep : abandoned.lastStep;
            trackApplicationForm(ApplicationFormEvents.RestoredFromAbandoned, { restored_to_step: stepToRestore, previous_last_step: abandoned.lastStep });
            setRestoredFromAbandoned(true);
            setHadLookupResult(hasStaging);
            // Staging as base; overlay abandoned only where abandoned has a value (so blanks in abandoned don't wipe Staging)
            const abandonedPayload = abandoned.payload;
            const staging = hasStaging ? stagingResult : null;
            const basePersonal = { ...formData.personal, ...(staging?.personal ?? {}) } as Record<string, unknown>;
            const baseBusiness = { ...formData.business, ...(staging?.business ?? {}) } as Record<string, unknown>;
            const baseFinancial = { ...formData.financial, ...(staging?.financial ?? {}) } as Record<string, unknown>;
            const baseCredit = { ...formData.creditOwnership, ...(staging?.creditOwnership ?? {}) } as Record<string, unknown>;
            const mergedPersonal = mergeSectionPreferNonEmpty(basePersonal, abandonedPayload.personal as Record<string, unknown>) as ApplicationFormData["personal"];
            const mergedBusiness = mergeSectionPreferNonEmpty(baseBusiness, abandonedPayload.business as Record<string, unknown>) as ApplicationFormData["business"];
            const mergedFinancial = mergeSectionPreferNonEmpty(baseFinancial, abandonedPayload.financial as Record<string, unknown>) as ApplicationFormData["financial"];
            const mergedCredit = mergeSectionPreferNonEmpty(baseCredit, abandonedPayload.creditOwnership as Record<string, unknown>) as ApplicationFormData["creditOwnership"];
            setFormData({
              step: stepToRestore as StepId,
              personal: mergedPersonal,
              business: mergedBusiness,
              financial: mergedFinancial,
              creditOwnership: mergedCredit,
              documents: initialFormState.documents,
              signature: abandonedPayload.signature,
            });
            if (abandoned.lastStep <= 1) {
              await upsertAbandonedProgress(
                email,
                stepToRestore,
                toAbandonedPayload(stepToRestore, mergedPersonal, mergedBusiness, mergedFinancial, mergedCredit, abandonedPayload.signature)
              );
            }
            setLookingUp(false);
            return;
          }

          if (hasStaging) {
            setHadLookupResult(true);
            setAnalyticsUserId(email);
            trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 1, to_step: nextStep, step_name: "Email", lookup_source: "staging" });
            const merged = {
              ...formData,
              step: nextStep,
              personal: { ...formData.personal, ...stagingResult.personal },
              business: { ...formData.business, ...stagingResult.business },
              financial: { ...formData.financial, ...stagingResult.financial },
              creditOwnership: { ...formData.creditOwnership, ...stagingResult.creditOwnership },
            };
            setFormData(merged);
            await upsertAbandonedProgress(
              email,
              nextStep,
              toAbandonedPayload(merged.step, merged.personal, merged.business, merged.financial, merged.creditOwnership, merged.signature)
            );
          } else {
            setLookupDebug(stagingResult.debug || null);
            setAnalyticsUserId(email);
            trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 1, to_step: nextStep, step_name: "Email", lookup_source: "none" });
            await upsertAbandonedProgress(
              email,
              nextStep,
              toAbandonedPayload(nextStep, formData.personal, formData.business, formData.financial, formData.creditOwnership, formData.signature)
            );
            setStep(nextStep);
          }
        } catch (e) {
          setLookupDebug(e instanceof Error ? e.message : String(e));
          setStep(nextStep);
        } finally {
          setLookingUp(false);
        }
      } else {
        trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: 1, to_step: nextStep, step_name: "Email" });
        setStep(nextStep);
      }
      return;
    }

    const section = STEP_SECTIONS.find((s) => s.id === currentStep);
    const stepName = section?.title ?? `Step ${currentStep}`;

    if (currentStep === 2) {
      const err = validateStep2(formData.business);
      if (err) {
        setStepError(err);
        trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 2, step_name: stepName, validation_error: err });
        return;
      }
    }
    if (currentStep === 3) {
      const err = validateStep3(formData.financial);
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
    trackApplicationForm(ApplicationFormEvents.StepCompleted, { from_step: currentStep, to_step: nextStep, step_name: stepName });
    const email = formData.personal.email.trim();
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setStepError(null);
      const step5Err = validateStep5(formData.documents, formData.signature, formData.personal);
      if (step5Err) {
        setSubmitError(step5Err);
        trackApplicationForm(ApplicationFormEvents.StepValidationFailed, { step: 5, step_name: "Documents & Agreement", validation_error: step5Err });
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
        };
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload));
        if (formData.documents.bankStatements) {
          for (let i = 0; i < formData.documents.bankStatements.length; i++) {
            fd.append("bank_statements", formData.documents.bankStatements[i]);
          }
        }
        if (formData.documents.voidCheck?.length) {
          fd.append("void_check", formData.documents.voidCheck[0]);
        }
        if (formData.documents.driversLicense?.length) {
          fd.append("drivers_license", formData.documents.driversLicense[0]);
        }
        const result = await submitApplication(fd);
        if (result.success) {
          trackApplicationForm(ApplicationFormEvents.FormSubmitted, { application_id: result.applicationId, step: 5, step_name: "Documents & Agreement" });
          if (result.pdfBase64 || result.additionalDetails) {
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
                })
              );
            } catch {
              // ignore
            }
            // Do not open PDF in a new tab; user stays on processing-application page and can open/download from the tile there.
          }
          router.push("/processing-application");
          return;
        } else {
          trackApplicationForm(ApplicationFormEvents.FormSubmitFailed, { error: result.error, step_name: "Documents & Agreement" });
          setSubmitError(result.error);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [formData, submitting]
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
            {lookupDebug && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                <p className="font-medium">Lookup note</p>
                <p className="mt-1 text-amber-800">{lookupDebug}</p>
              </div>
            )}
            {stepError && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
                {stepError}
              </div>
            )}
            {submitError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {submitError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-8">
              <div className="min-h-[320px]">
                {currentStep === 1 && (
                  <Step1PersonalInfo
                    data={formData.personal}
                    onChange={(personal) =>
                      setFormData((prev) => ({ ...prev, personal }))
                    }
                  />
                )}
                {currentStep === 2 && (
                  <Step2BusinessInfo
                    data={formData.business}
                    onChange={(business) =>
                      setFormData((prev) => ({ ...prev, business }))
                    }
                    highlightEmpty={hadLookupResult}
                  />
                )}
                {currentStep === 3 && (
                  <Step3FinancialFunding
                    data={formData.financial}
                    onChange={(financial) =>
                      setFormData((prev) => ({ ...prev, financial }))
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
                    highlightEmpty={hadLookupResult}
                  />
                )}
                {currentStep === 5 && (
                  <Step5DocumentsAndSignature
                    documents={formData.documents}
                    signature={formData.signature}
                    onDocumentsChange={(documents) =>
                      setFormData((prev) => ({ ...prev, documents }))
                    }
                    onSignatureChange={(signature) =>
                      setFormData((prev) => ({ ...prev, signature }))
                    }
                    personal={formData.personal}
                    onPersonalChange={(personal) =>
                      setFormData((prev) => ({ ...prev, personal }))
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
                  {currentStep < TOTAL_STEPS ? (
                    <button
                      type="button"
                      onClick={() => goNext()}
                      disabled={lookingUp}
                      className="rounded-lg bg-[var(--brand-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {lookingUp ? "Looking up your details…" : "Next"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-[var(--brand-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting…" : "Submit Application"}
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
