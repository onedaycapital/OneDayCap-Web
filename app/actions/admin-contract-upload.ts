"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import {
  buildExtractionUserPrompt,
  parseExtractionResult,
  EXTRACTION_SYSTEM_PROMPT,
  type ExtractedFunderGuidelines,
} from "@/lib/extract-funder-guidelines";

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    await parser.destroy();
    return typeof result.text === "string" ? result.text : "";
  } catch (e) {
    await parser.destroy().catch(() => {});
    throw e;
  }
}

export interface ExtractResult {
  success: boolean;
  error?: string;
  data?: ExtractedFunderGuidelines;
}

export async function extractFunderGuidelinesFromPdf(formData: FormData): Promise<ExtractResult> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "No file selected." };
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { success: false, error: "File must be a PDF." };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return { success: false, error: "OPENAI_API_KEY is not set. Add it to .env.local for extraction." };
  }
  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } catch {
    return { success: false, error: "Could not read file." };
  }
  let text: string;
  try {
    text = await extractTextFromPdf(buffer);
  } catch (e) {
    return { success: false, error: "PDF text extraction failed: " + (e instanceof Error ? e.message : String(e)) };
  }
  if (!text?.trim()) {
    return { success: false, error: "No text could be extracted from the PDF (e.g. scanned image)." };
  }
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });
  const userPrompt = buildExtractionUserPrompt(text);
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "No response from OpenAI." };
    }
    const data = parseExtractionResult(content);
    if (!data) {
      return { success: false, error: "Could not parse extraction result." };
    }
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: "OpenAI request failed: " + (e instanceof Error ? e.message : String(e)),
    };
  }
}

export interface SaveFunderGuidelinesPayload extends ExtractedFunderGuidelines {
  funder_id?: string | null;
  mark_iso_signed?: boolean;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  funderId?: string;
}

export async function saveExtractedFunderGuidelines(payload: SaveFunderGuidelinesPayload): Promise<SaveResult> {
  const supabase = getSupabaseServer();
  const funderName = (payload.funder_name ?? "").trim() || null;
  let funderId: string | null = payload.funder_id?.trim() || null;

  if (!funderId && !funderName) {
    return { success: false, error: "Provide an existing funder or a new funder name." };
  }

  if (!funderId) {
    const { data: newFunder, error: insertErr } = await supabase
      .from("funders")
      .insert({
        name: funderName!,
        iso_agreement_signed: payload.mark_iso_signed ?? false,
      })
      .select("id")
      .single();
    if (insertErr) {
      return { success: false, error: insertErr.message };
    }
    funderId = newFunder.id as string;
  } else if (payload.mark_iso_signed) {
    await supabase.from("funders").update({ iso_agreement_signed: true }).eq("id", funderId);
  }

  const guidelineRow = {
    funder_id: funderId,
    min_funding: payload.min_funding ?? null,
    max_funding: payload.max_funding ?? null,
    states_allowed: payload.states_allowed?.length ? payload.states_allowed : null,
    states_excluded: payload.states_excluded?.length ? payload.states_excluded : null,
    turnaround_time: payload.turnaround_time ?? null,
    revenue_min: payload.revenue_min ?? null,
    revenue_max: payload.revenue_max ?? null,
    min_time_in_biz: payload.min_time_in_biz ?? null,
    required_docs: payload.required_docs?.length ? payload.required_docs : null,
    industries: payload.industries?.length ? payload.industries : null,
  };

  const { error: upsertErr } = await supabase.from("funder_guidelines").upsert(guidelineRow, {
    onConflict: "funder_id",
    ignoreDuplicates: false,
  });
  if (upsertErr) {
    const { error: insertErr } = await supabase.from("funder_guidelines").insert(guidelineRow);
    if (insertErr) {
      return { success: false, error: insertErr.message };
    }
  }

  return { success: true, funderId };
}
