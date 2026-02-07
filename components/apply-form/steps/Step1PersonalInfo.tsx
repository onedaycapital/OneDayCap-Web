"use client";

import type { PersonalInfo } from "../types";

interface Props {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

export function Step1PersonalInfo({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold text-slate-800">Get Started</h2>
      <p className="text-slate-600 text-sm">
        Enter your email address. If we or our network of funders have your profile on file, we&apos;ll prefill the form so you can review and complete any missing information.
      </p>
      <div className="max-w-md">
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email ID <span className="text-red-600">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-[var(--brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
          required
        />
      </div>
    </div>
  );
}
