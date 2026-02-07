"use client";

import type { FinancialFundingInfo } from "../types";
import { RadioTiles } from "../RadioTiles";
import { formatFundingRequestCurrency, parseFundingRequest } from "../formatters";

const emptyInputClass = "border-amber-400 bg-amber-50/50 focus:border-amber-500 focus:ring-amber-500";
const normalInputClass = "border-slate-200 focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue)]";

interface Props {
  data: FinancialFundingInfo;
  onChange: (data: FinancialFundingInfo) => void;
  highlightEmpty?: boolean;
}

const USE_OF_FUNDS_OPTIONS = [
  { value: "working-capital", label: "Working Capital" },
  { value: "business-expansion", label: "Business Expansion" },
  { value: "debt-refinancing", label: "Debt Refinancing" },
  { value: "others", label: "Others" },
];

const MONTHLY_REVENUE_OPTIONS = [
  { value: "under-50k", label: "<$50,000" },
  { value: "50k-100k", label: "$50,000 - $100,000" },
  { value: "over-100k", label: "> $100,000" },
];

export function Step3FinancialFunding({ data, onChange, highlightEmpty }: Props) {
  const isEmpty = (v: string) => !(v && String(v).trim());
  const inputClass = (empty: boolean) =>
    `w-full max-w-xs rounded-lg border bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
      highlightEmpty && empty ? emptyInputClass : normalInputClass
    }`;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold text-slate-800">Financial & Funding Information</h2>
      <p className="text-slate-600 text-sm">Share your funding needs and financial overview. Complete any fields that are still missing.</p>

      <RadioTiles
        name="monthlyRevenue"
        question="Monthly Revenue"
        instruction="Choose the range that best describes your monthly revenue:"
        options={MONTHLY_REVENUE_OPTIONS}
        value={data.monthlyRevenue}
        onChange={(monthlyRevenue) => onChange({ ...data, monthlyRevenue })}
        required
        highlightEmpty={highlightEmpty}
      />

      <div>
        <label htmlFor="fundingRequest" className="mb-1.5 block text-sm font-medium text-slate-700">
          Funding Request *
        </label>
        <input
          id="fundingRequest"
          type="text"
          inputMode="numeric"
          value={formatFundingRequestCurrency(data.fundingRequest)}
          onChange={(e) => onChange({ ...data, fundingRequest: parseFundingRequest(e.target.value) })}
          placeholder="$0"
          className={inputClass(isEmpty(data.fundingRequest))}
          required
        />
      </div>

      <RadioTiles
        name="useOfFunds"
        question="Use of Funds"
        instruction="Choose one of the options provided:"
        options={USE_OF_FUNDS_OPTIONS}
        value={data.useOfFunds}
        onChange={(useOfFunds) => onChange({ ...data, useOfFunds })}
        required
        highlightEmpty={highlightEmpty}
      />
    </div>
  );
}
