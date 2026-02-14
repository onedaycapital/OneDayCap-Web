"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStagingRow, dismissStagingDuplicateEmail, type DuplicateEmailGroup } from "@/app/actions/admin-duplicate-emails";

export function DuplicateEmailsClient({
  groups,
  error,
}: {
  groups: DuplicateEmailGroup[];
  error?: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [dismissingEmail, setDismissingEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDoNothing = async (email: string) => {
    setMessage(null);
    setDismissingEmail(email);
    try {
      const result = await dismissStagingDuplicateEmail(email);
      if (result.success) {
        setMessage({ type: "success", text: "Dismissed. This email will not show again." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed." });
      }
    } finally {
      setDismissingEmail(null);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Delete this row from Staging? This cannot be undone.")) return;
    setMessage(null);
    setDeletingId(id);
    try {
      const result = await deleteStagingRow(id);
      if (result.success) {
        setMessage({ type: "success", text: "Row deleted. Refreshing…" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Delete failed." });
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (error) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        {error}
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-600 rounded-lg border border-slate-200 bg-white p-4">
        No duplicate emails found in Staging. Each email appears in at most one row.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          className={
            message.type === "error"
              ? "text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              : "text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2"
          }
        >
          {message.text}
        </p>
      )}
      <p className="text-sm text-slate-600">
        <strong>{groups.length}</strong> email{groups.length !== 1 ? "s" : ""} appear in more than one row.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="py-2 px-3 font-medium text-slate-700">Email</th>
              <th className="py-2 px-3 font-medium text-slate-700"># Rows</th>
              <th className="py-2 px-3 font-medium text-slate-700">Rows (company / ID)</th>
              <th className="py-2 px-3 font-medium text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.email} className="border-b border-slate-100">
                <td className="py-2 px-3 text-slate-800 font-mono text-xs">{g.email}</td>
                <td className="py-2 px-3 text-slate-600">{g.rows.length}</td>
                <td className="py-2 px-3">
                  <ul className="space-y-1">
                    {g.rows.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-800">
                          {r.businessName ?? "(no name)"} <span className="text-slate-500">(id: {r.id})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === r.id ? "Deleting…" : "Delete row"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => handleDoNothing(g.email)}
                    disabled={dismissingEmail === g.email}
                    className="text-xs text-slate-600 hover:underline disabled:opacity-50"
                  >
                    {dismissingEmail === g.email ? "Dismissing…" : "Do nothing (hide from list)"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
