"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PersonalCreditOwnership, PersonalInfo, SignatureAudit } from "../types";
import { formatSSN, getDigits } from "../formatters";
import { SignaturePad } from "../SignaturePad";

const SSN_MASK_DELAY_MS = 3000;

interface Props {
  data: PersonalCreditOwnership;
  onChange: (data: PersonalCreditOwnership) => void;
  personal: PersonalInfo;
  onPersonalChange: (data: PersonalInfo) => void;
  signature: SignatureAudit;
  onSignatureChange: (data: SignatureAudit) => void;
  highlightEmpty?: boolean;
}

const emptyInputClass = "border-amber-400 bg-amber-50/50 focus:border-amber-500 focus:ring-amber-500";
const normalInputClass = "border-slate-200 focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue)]";

export function Step4PersonalCreditOwnership({ data, onChange, personal, onPersonalChange, signature, onSignatureChange, highlightEmpty }: Props) {
  const [ssnMasked, setSsnMasked] = useState(false);
  const ssnMaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSsnMaskTimer = useCallback(() => {
    if (ssnMaskTimerRef.current) clearTimeout(ssnMaskTimerRef.current);
    ssnMaskTimerRef.current = setTimeout(() => setSsnMasked(true), SSN_MASK_DELAY_MS);
  }, []);

  const clearSsnMaskTimer = useCallback(() => {
    if (ssnMaskTimerRef.current) {
      clearTimeout(ssnMaskTimerRef.current);
      ssnMaskTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearSsnMaskTimer();
  }, [clearSsnMaskTimer]);

  const digits = getDigits(data.ssn);
  const ssnLast4 = digits.length >= 4 ? digits.slice(-4) : "";
  const ssnDisplay =
    ssnMasked && digits.length === 9 ? `***-**-${ssnLast4}` : data.ssn;
  const ssnError =
    digits.length > 0 && digits.length !== 9
      ? "SSN must be exactly 9 digits."
      : null;

  const handleSsnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSSN(e.target.value);
    onChange({ ...data, ssn: formatted });
    setSsnMasked(false);
    clearSsnMaskTimer();
    startSsnMaskTimer();
  };

  const handleSsnFocus = () => {
    setSsnMasked(false);
    clearSsnMaskTimer();
  };

  const isEmpty = (v: string) => !(v && String(v).trim());
  const inputClass = (empty: boolean) =>
    `w-full rounded-lg border bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
      highlightEmpty && empty ? emptyInputClass : normalInputClass
    }`;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold text-slate-800">Personal Credit & Ownership Details</h2>
      <p className="text-slate-600 text-sm">Contact and ownership information.</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
            First Name <span className="text-red-600">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            value={personal.firstName}
            onChange={(e) => onPersonalChange({ ...personal, firstName: e.target.value })}
            placeholder="First Name"
            className={inputClass(isEmpty(personal.firstName))}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
            Last Name <span className="text-red-600">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={personal.lastName}
            onChange={(e) => onPersonalChange({ ...personal, lastName: e.target.value })}
            placeholder="Last Name"
            className={inputClass(isEmpty(personal.lastName))}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
            Phone <span className="text-red-600">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={personal.phone}
            onChange={(e) => onPersonalChange({ ...personal, phone: e.target.value })}
            placeholder="Phone"
            className={inputClass(isEmpty(personal.phone))}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ssn" className="mb-1.5 block text-sm font-medium text-slate-700">
            SSN *
          </label>
          <input
            id="ssn"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={ssnDisplay}
            onChange={handleSsnChange}
            onFocus={handleSsnFocus}
            placeholder="xxx-xx-xxxx"
            className={`w-full rounded-lg border bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
              ssnError
                ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                : highlightEmpty && isEmpty(data.ssn)
                  ? emptyInputClass
                  : "border-slate-200 focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue)]"
            }`}
            required
          />
          {ssnError && (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {ssnError}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">
            Address
          </label>
          <input
            id="address"
            type="text"
            value={data.address}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            placeholder="Address"
            className={inputClass(isEmpty(data.address))}
          />
        </div>
        <div>
          <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            id="city"
            type="text"
            value={data.city}
            onChange={(e) => onChange({ ...data, city: e.target.value })}
            placeholder="City"
            className={inputClass(isEmpty(data.city))}
          />
        </div>
        <div>
          <label htmlFor="state" className="mb-1.5 block text-sm font-medium text-slate-700">
            State
          </label>
          <input
            id="state"
            type="text"
            value={data.state}
            onChange={(e) => onChange({ ...data, state: e.target.value })}
            placeholder="State"
            className={inputClass(isEmpty(data.state))}
          />
        </div>
        <div>
          <label htmlFor="zip" className="mb-1.5 block text-sm font-medium text-slate-700">
            ZIP
          </label>
          <input
            id="zip"
            type="text"
            value={data.zip}
            onChange={(e) => onChange({ ...data, zip: e.target.value })}
            placeholder="ZIP"
            className={inputClass(isEmpty(data.zip))}
          />
        </div>
        <div>
          <label htmlFor="ownershipPercent" className="mb-1.5 block text-sm font-medium text-slate-700">
            Ownership %
          </label>
          <input
            id="ownershipPercent"
            type="text"
            value={data.ownershipPercent}
            onChange={(e) => onChange({ ...data, ownershipPercent: e.target.value })}
            placeholder="e.g. 100"
            className={inputClass(false)}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
          <p>
            By submitting this application, each of the above listed business and
            business owner/officer (individually and collectively, &quot;you&quot;)
            authorize OneDay Capital LLC and each of its representatives,
            successors, assigns and designees (&quot;Recipients&quot;) that may be
            involved with or acquire commercial loans having daily repayment
            features or purchases of future receivables including Merchant Cash
            Advance transactions, including without limitation the application
            therefor (collectively, &quot;Transactions&quot;) to obtain consumer or
            personal, business and investigative reports and other information about
            you, including credit card processor statements and bank statements,
            from one or more consumer reporting agencies, such as TransUnion,
            Experian and Equifax, and from other credit bureaus, banks, creditors
            and other third parties. You also authorize OneDay Capital LLC to
            transmit this application form, along with any of the foregoing
            information obtained in connection with this application, to any or all
            of the Recipients for the foregoing purposes. You also consent to the
            release, by any creditor or financial institution, of any information
            relating to any of you, to OneDay Capital LLC and to each of the
            Recipients, on its own behalf.
          </p>
          <p>
            <strong>
              CONSENT TO TELEPHONE CALLS, SMS, WhatsApp, iMessaging:
            </strong>{" "}
            You expressly consent to receiving marketing and other calls and
            messages, to landline, wireless or similar devices, including
            auto-dialed and pre-recorded message calls, and SMS messages (including
            text messages) from recipients, at telephone numbers that you have
            provided. Message and data rates may apply. Your consent to receive
            marketing calls is not required for your application. If you do not
            consent, do not provide your phone number.
          </p>
          <p>
            <strong>CONSENT TO ELECTRONIC DISCLOSURE:</strong> You expressly
            consent to transactions and disclosures with recipients online and
            electronically. Disclosure will be provided to you either on the
            screen, on recipients&apos; website or via electronic mail to the email
            address you provided.
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={personal.smsConsent}
            onChange={(e) =>
              onPersonalChange({ ...personal, smsConsent: e.target.checked })
            }
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]"
          />
          <span className="text-sm font-medium text-slate-800">
            I have read and agree to the terms and consents above.{" "}
            <span className="text-red-600">*</span>
          </span>
        </label>
      </div>

      <div className="border-t border-slate-200 pt-8">
        <h3 className="font-heading text-xl font-bold text-slate-800">
          Agreement - Sign &amp; Conclude
        </h3>
        <p className="mt-1 text-slate-600 text-sm">
          Sign below to confirm the information provided is accurate. Click Save &amp; Next to save your application and continue to document upload.
        </p>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Your signature <span className="text-red-600">*</span>
          </label>
          <SignaturePad
            onSignatureChange={(dataUrl) => {
              const signedAt = dataUrl ? new Date().toISOString() : null;
              const auditId = dataUrl ? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : null;
              onSignatureChange({ signatureDataUrl: dataUrl, signedAt, auditId });
            }}
            signedAt={signature.signedAt}
            auditId={signature.auditId}
          />
        </div>
      </div>
    </div>
  );
}
