"use client";

import type { BusinessInfo } from "../types";
import { RadioTiles } from "../RadioTiles";
import { formatEIN, getDigits } from "../formatters";
import { INDUSTRY_OPTIONS } from "@/lib/industry-risk";

const emptyInputClass = "border-amber-400 bg-amber-50/50 focus:border-amber-500 focus:ring-amber-500";
const normalInputClass = "border-slate-200 focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue)]";

interface Props {
  data: BusinessInfo;
  onChange: (data: BusinessInfo) => void;
  /** Highlight empty required fields (e.g. after prefill) */
  highlightEmpty?: boolean;
}

const TYPE_OF_BUSINESS_OPTIONS = [
  { value: "llc", label: "LLC" },
  { value: "c-corp", label: "C-Corp" },
  { value: "s-corp", label: "S-Corp" },
  { value: "partnership", label: "Partnership" },
  { value: "others", label: "Others" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fields: { key: keyof BusinessInfo; label: string; type: string; placeholder: string; required: boolean }[] = [
  { key: "businessName", label: "Business Name", type: "text", placeholder: "Business Name", required: true },
  { key: "dba", label: "DBA (Doing Business As)", type: "text", placeholder: "DBA", required: false },
  { key: "address", label: "Address", type: "text", placeholder: "Address", required: true },
  { key: "city", label: "City", type: "text", placeholder: "City", required: true },
  { key: "state", label: "State", type: "text", placeholder: "State", required: true },
  { key: "zip", label: "Zip", type: "text", placeholder: "Zip", required: true },
];

function parseStartDate(value: string): { month: string; year: string } {
  if (!value || typeof value !== "string") return { month: "", year: "" };
  const full = value.match(/^([A-Za-z]+),\s*(\d{4})$/);
  if (full) return { month: full[1], year: full[2] };
  const monthOnly = value.match(/^([A-Za-z]+),?\s*$/);
  if (monthOnly) return { month: monthOnly[1], year: "" };
  const yearOnly = value.match(/^,?\s*(\d{4})$/);
  if (yearOnly) return { month: "", year: yearOnly[1] };
  return { month: "", year: "" };
}

function formatStartDate(month: string, year: string): string {
  if (month && year) return `${month}, ${year}`;
  if (month) return `${month},`;
  if (year) return `, ${year}`;
  return "";
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => String(currentYear - i));

export function Step2BusinessInfo({ data, onChange, highlightEmpty }: Props) {
  const { month: startMonth, year: startYear } = parseStartDate(data.startDateOfBusiness);
  const isEmpty = (v: string) => !(v && String(v).trim());
  const inputClass = (empty: boolean) =>
    `w-full rounded-lg border bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-1 ${
      highlightEmpty && empty ? emptyInputClass : normalInputClass
    }`;

  const setStartDate = (month: string, year: string) => {
    onChange({ ...data, startDateOfBusiness: formatStartDate(month, year) });
  };

  const startDateEmpty = !startMonth || !startYear;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold text-slate-800">Business Information</h2>
      <p className="text-slate-600 text-sm">Tell us about your business. Complete any fields that are still missing.</p>

      <RadioTiles
        name="typeOfBusiness"
        question="Type of Business"
        instruction="Choose one of the options provided:"
        options={TYPE_OF_BUSINESS_OPTIONS}
        value={data.typeOfBusiness}
        onChange={(typeOfBusiness) => onChange({ ...data, typeOfBusiness })}
        required
        highlightEmpty={highlightEmpty}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">
          Start Date of Business <span className="text-red-600">*</span>
        </p>
        <p className="text-slate-600 text-sm">Month and year when the business started (e.g. Aug, 2012).</p>
        <div className={`flex flex-wrap gap-4 ${highlightEmpty && startDateEmpty ? "rounded-lg ring-2 ring-amber-400 ring-offset-2 p-2" : ""}`}>
          <div className="min-w-[8rem]">
            <label htmlFor="startMonth" className="sr-only">Month</label>
            <select
              id="startMonth"
              value={startMonth}
              onChange={(e) => setStartDate(e.target.value, startYear)}
              className={inputClass(startDateEmpty)}
              required
            >
              <option value="">Month</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[8rem]">
            <label htmlFor="startYear" className="sr-only">Year</label>
            <select
              id="startYear"
              value={startYear}
              onChange={(e) => setStartDate(startMonth, e.target.value)}
              className={inputClass(startDateEmpty)}
              required
            >
              <option value="">Year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="ein" className="block text-sm font-medium text-slate-700">
          EIN <span className="text-red-600">*</span>
        </label>
        <p className="text-slate-600 text-sm">Format: xx-xxxxxxx (9 digits). You may type with or without the dash.</p>
        <input
          id="ein"
          type="text"
          inputMode="numeric"
          value={data.ein}
          onChange={(e) => onChange({ ...data, ein: formatEIN(e.target.value) })}
          placeholder="xx-xxxxxxx"
          className={`w-full max-w-xs rounded-lg border bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
            getDigits(data.ein).length > 0 && getDigits(data.ein).length !== 9
              ? "border-red-400 focus:border-red-400 focus:ring-red-400"
              : highlightEmpty && getDigits(data.ein).length !== 9
                ? emptyInputClass
                : normalInputClass
          }`}
          required
        />
        {getDigits(data.ein).length > 0 && getDigits(data.ein).length !== 9 && (
          <p className="text-sm text-red-600" role="alert">
            EIN must be exactly 9 digits.
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(({ key, label, type, placeholder, required }) => (
          <div key={key} className={key === "address" ? "sm:col-span-2" : "sm:col-span-1"}>
            <label htmlFor={key} className="mb-1.5 block text-sm font-medium text-slate-700">
              {label} {required && "*"}
            </label>
            <input
              id={key}
              type={type}
              value={data[key]}
              onChange={(e) => onChange({ ...data, [key]: e.target.value })}
              placeholder={placeholder}
              className={inputClass(required && isEmpty(data[key]))}
              required={required}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label htmlFor="industry" className="mb-1.5 block text-sm font-medium text-slate-700">
            Industry <span className="text-red-600">*</span>
          </label>
          <p className="mb-1.5 text-slate-600 text-sm">Select the option that best describes your company.</p>
          <select
            id="industry"
            value={data.industry}
            onChange={(e) => onChange({ ...data, industry: e.target.value })}
            className={inputClass(isEmpty(data.industry))}
            required
          >
            <option value="">Select industry…</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
