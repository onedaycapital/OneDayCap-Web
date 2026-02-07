"use client";

import { useState, useCallback } from "react";
import type { DocumentUploads, SignatureAudit, UploadedFileMetadata } from "../types";
import type { PersonalInfo } from "../types";
import { ACCEPTED_FILE_TYPES } from "../types";
import { SignaturePad } from "../SignaturePad";
import {
  uploadFileToSupabase,
  uploadMultipleFiles,
  validateFileType,
  formatFileSize,
  type UploadProgress,
} from "@/lib/upload-helpers";
import type { FileCategory } from "@/app/actions/create-upload-url";
import { deleteUploadedFile } from "@/app/actions/cleanup-uploads";

interface Props {
  documents: DocumentUploads;
  signature: SignatureAudit;
  onDocumentsChange: (documents: DocumentUploads) => void;
  onSignatureChange: (signature: SignatureAudit) => void;
  personal: PersonalInfo;
  onPersonalChange: (data: PersonalInfo) => void;
  onSignConfirm?: () => void;
}

interface FileUploadState {
  [key: string]: UploadProgress;
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
  const [uploadStates, setUploadStates] = useState<FileUploadState>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateUploadProgress = useCallback((progress: UploadProgress) => {
    setUploadStates((prev) => ({
      ...prev,
      [progress.fileName]: progress,
    }));
  }, []);

  const handleBankStatementsUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploadError(null);
      const fileArray = Array.from(files);

      // Validate all files
      for (const file of fileArray) {
        const validation = validateFileType(file);
        if (validation !== true) {
          setUploadError(validation);
          return;
        }
      }

      // Upload all files
      const results = await uploadMultipleFiles(
        fileArray,
        "bank_statements",
        updateUploadProgress
      );

      // Check for errors
      const errors = results.filter((r) => !r.success);
      if (errors.length > 0) {
        setUploadError(
          errors[0].error || "Some files failed to upload. Please try again."
        );
        return;
      }

      // Add successful uploads to documents
      const newMetadata = results
        .filter((r) => r.success && r.metadata)
        .map((r) => r.metadata!);

      onDocumentsChange({
        ...documents,
        bankStatements: [...documents.bankStatements, ...newMetadata],
      });
    },
    [documents, onDocumentsChange, updateUploadProgress]
  );

  const handleSingleFileUpload = useCallback(
    async (
      files: FileList | null,
      category: FileCategory,
      field: "voidCheck" | "driversLicense"
    ) => {
      if (!files || files.length === 0) return;

      setUploadError(null);
      const file = files[0];

      // Validate file
      const validation = validateFileType(file);
      if (validation !== true) {
        setUploadError(validation);
        return;
      }

      // Upload file
      const result = await uploadFileToSupabase(
        file,
        category,
        updateUploadProgress
      );

      if (!result.success) {
        setUploadError(result.error || "Upload failed. Please try again.");
        return;
      }

      // Update documents
      onDocumentsChange({
        ...documents,
        [field]: result.metadata!,
      });
    },
    [documents, onDocumentsChange, updateUploadProgress]
  );

  const handleRemoveFile = useCallback(
    async (
      field: "bankStatements" | "voidCheck" | "driversLicense",
      index?: number
    ) => {
      if (field === "bankStatements" && index !== undefined) {
        const fileToRemove = documents.bankStatements[index];
        if (fileToRemove) {
          // Delete from storage
          await deleteUploadedFile(fileToRemove.storage_path);
          // Remove from state
          const newBankStatements = documents.bankStatements.filter(
            (_, i) => i !== index
          );
          onDocumentsChange({
            ...documents,
            bankStatements: newBankStatements,
          });
        }
      } else if (field === "voidCheck" || field === "driversLicense") {
        const fileToRemove = documents[field];
        if (fileToRemove) {
          // Delete from storage
          await deleteUploadedFile(fileToRemove.storage_path);
          // Remove from state
          onDocumentsChange({
            ...documents,
            [field]: null,
          });
        }
      }
    },
    [documents, onDocumentsChange]
  );

  const handleSignatureData = useCallback(
    (dataUrl: string | null) => {
      const signedAt = dataUrl ? new Date().toISOString() : null;
      const auditId = dataUrl
        ? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        : null;
      onSignatureChange({ signatureDataUrl: dataUrl, signedAt, auditId });
    },
    [onSignatureChange]
  );

  const renderUploadProgress = (fileName: string) => {
    const state = uploadStates[fileName];
    if (!state) return null;

    if (state.status === "uploading") {
      return (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Uploading {fileName}...</span>
            <span>{state.progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      );
    }

    if (state.status === "error") {
      return (
        <div className="mt-2 text-xs text-red-600">
          Error uploading {fileName}: {state.error}
        </div>
      );
    }

    return null;
  };

  const renderUploadedFile = (
    file: UploadedFileMetadata,
    onRemove: () => void
  ) => {
    return (
      <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-700">{file.file_name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(file.file_size)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-600 transition-colors"
          title="Remove file"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  };

  const fileInputClass =
    "mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--brand-blue)] file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-[var(--brand-blue-hover)] cursor-pointer";

  const isUploading = Object.values(uploadStates).some(
    (state) => state.status === "uploading"
  );

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-800">
          Document Uploads
        </h2>
        <p className="mt-1 text-slate-600 text-sm">
          You may upload documents below. Accepted: PDF, JPG, JPEG, GIF, CSV. Large files are
          supported and uploaded securely.
        </p>
        {isUploading && (
          <p className="mt-2 text-sm text-blue-600 font-medium">
            Uploading files... Please wait.
          </p>
        )}
        {uploadError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Bank Statements
          </label>
          <p className="text-slate-500 text-xs">
            Consecutive months of bank statements. PDF preferred. Multiple files
            allowed.
          </p>
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            onChange={(e) => handleBankStatementsUpload(e.target.files)}
            className={fileInputClass}
            disabled={isUploading}
          />
          {documents.bankStatements.length > 0 && (
            <div className="mt-3 space-y-2">
              {documents.bankStatements.map((file, index) =>
                renderUploadedFile(file, () =>
                  handleRemoveFile("bankStatements", index)
                )
              )}
            </div>
          )}
          {Object.keys(uploadStates).map((fileName) => {
            const state = uploadStates[fileName];
            if (
              state.status === "uploading" &&
              !documents.bankStatements.some((f) => f.file_name === fileName)
            ) {
              return renderUploadProgress(fileName);
            }
            return null;
          })}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            VOID Check
          </label>
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={(e) =>
              handleSingleFileUpload(e.target.files, "void_check", "voidCheck")
            }
            className={fileInputClass}
            disabled={isUploading}
          />
          {documents.voidCheck &&
            renderUploadedFile(documents.voidCheck, () =>
              handleRemoveFile("voidCheck")
            )}
          {uploadStates["voidCheck"] && renderUploadProgress("voidCheck")}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Driver&apos;s License
          </label>
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={(e) =>
              handleSingleFileUpload(
                e.target.files,
                "drivers_license",
                "driversLicense"
              )
            }
            className={fileInputClass}
            disabled={isUploading}
          />
          {documents.driversLicense &&
            renderUploadedFile(documents.driversLicense, () =>
              handleRemoveFile("driversLicense")
            )}
          {uploadStates["driversLicense"] &&
            renderUploadProgress("driversLicense")}
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
          Agreement — Sign &amp; Conclude
        </h3>
        <p className="mt-1 text-slate-600 text-sm">
          Sign below to confirm the information provided is accurate and to
          conclude your application.
        </p>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Your signature <span className="text-red-600">*</span>
          </label>
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
