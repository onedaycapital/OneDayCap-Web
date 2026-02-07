"use client";

import { useCallback } from "react";
import type { DocumentUploads, SignatureAudit } from "../types";
import type { PersonalInfo } from "../types";
import { ACCEPTED_FILE_TYPES } from "../types";
import { SignaturePad } from "../SignaturePad";

interface Props {
  documents: DocumentUploads;
  signature: SignatureAudit;
  onDocumentsChange: (documents: DocumentUploads) => void;
  onSignatureChange: (signature: SignatureAudit) => void;
  personal: PersonalInfo;
  onPersonalChange: (data: PersonalInfo) => void;
  onSignConfirm?: () => void;
}

export function Step5DocumentsAndSignature({
  documents,
  signature,
  onDocumentsChange,
  onSignatureChange,
  personal,
  onPersonalChange,
  onSignConfirm,
}: Props) {
  const handleFileChange = useCallback(
    (key: keyof DocumentUploads, files: FileList | null) => {
      onDocumentsChange({ ...documents, [key]: files });
    },
    [documents, onDocumentsChange]
  );

  const handleSignatureData = useCallback(
    (dataUrl: string | null) => {
      const signedAt = dataUrl ? new Date().toISOString() : null;
      const auditId = dataUrl ? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : null;
      onSignatureChange({ signatureDataUrl: dataUrl, signedAt, auditId });
    },
    [onSignatureChange]
  );

  const fileInputClass =
    "mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--brand-blue)] file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-[var(--brand-blue-hover)]";

  const bankCount = documents.bankStatements?.length ?? 0;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-800">Document Uploads</h2>
        <p className="mt-1 text-slate-600 text-sm">
          You may upload documents below. Accepted: PDF, JPG, JPEG, GIF, CSV.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Bank Statements</label>
          <p className="text-slate-500 text-xs">
            Consecutive months of bank statements. PDF preferred. Multiple files allowed.
          </p>
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            onChange={(e) => handleFileChange("bankStatements", e.target.files)}
            className={fileInputClass}
          />
          {bankCount > 0 && (
            <p className="mt-1 text-slate-600 text-sm">{bankCount} file(s) selected</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">VOID Check</label>
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={(e) => handleFileChange("voidCheck", e.target.files)}
            className={fileInputClass}
          />
          {documents.voidCheck?.length === 1 && (
            <p className="mt-1 text-slate-600 text-sm">1 file selected</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Driver&apos;s License</label>
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={(e) => handleFileChange("driversLicense", e.target.files)}
            className={fileInputClass}
          />
          {documents.driversLicense?.length === 1 && (
            <p className="mt-1 text-slate-600 text-sm">1 file selected</p>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
          <p>
            By submitting this application, each of the above listed business and business owner/officer (individually and collectively, &quot;you&quot;) authorize OneDay Capital LLC and each of its representatives, successors, assigns and designees (&quot;Recipients&quot;) that may be involved with or acquire commercial loans having daily repayment features or purchases of future receivables including Merchant Cash Advance transactions, including without limitation the application therefor (collectively, &quot;Transactions&quot;) to obtain consumer or personal, business and investigative reports and other information about you, including credit card processor statements and bank statements, from one or more consumer reporting agencies, such as TransUnion, Experian and Equifax, and from other credit bureaus, banks, creditors and other third parties. You also authorize OneDay Capital LLC to transmit this application form, along with any of the foregoing information obtained in connection with this application, to any or all of the Recipients for the foregoing purposes. You also consent to the release, by any creditor or financial institution, of any information relating to any of you, to OneDay Capital LLC and to each of the Recipients, on its own behalf.
          </p>
          <p>
            <strong>CONSENT TO TELEPHONE CALLS, SMS, WhatsApp, iMessaging:</strong> You expressly consent to receiving marketing and other calls and messages, to landline, wireless or similar devices, including auto-dialed and pre-recorded message calls, and SMS messages (including text messages) from recipients, at telephone numbers that you have provided. Message and data rates may apply. Your consent to receive marketing calls is not required for your application. If you do not consent, do not provide your phone number.
          </p>
          <p>
            <strong>CONSENT TO ELECTRONIC DISCLOSURE:</strong> You expressly consent to transactions and disclosures with recipients online and electronically. Disclosure will be provided to you either on the screen, on recipients&apos; website or via electronic mail to the email address you provided.
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={personal.smsConsent}
            onChange={(e) => onPersonalChange({ ...personal, smsConsent: e.target.checked })}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]"
          />
          <span className="text-sm font-medium text-slate-800">
            I have read and agree to the terms and consents above. <span className="text-red-600">*</span>
          </span>
        </label>
      </div>

      <div className="border-t border-slate-200 pt-8">
        <h3 className="font-heading text-xl font-bold text-slate-800">Agreement — Sign &amp; Conclude</h3>
        <p className="mt-1 text-slate-600 text-sm">
          Sign below to confirm the information provided is accurate and to conclude your application.
        </p>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Your signature <span className="text-red-600">*</span></label>
          <SignaturePad
            onSignatureChange={handleSignatureData}
            signedAt={signature.signedAt}
            auditId={signature.auditId}
          />
        </div>
        {signature.signatureDataUrl && onSignConfirm && (
          <p className="mt-2 text-sm text-emerald-700">
            Signature captured. Submit the form to complete your application.
          </p>
        )}
      </div>
    </div>
  );
}
