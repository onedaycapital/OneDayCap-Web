"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

export interface AdminFunderRow {
  id: string;
  name: string;
  relationshipStatus: string;
  isoAgreementSigned: boolean;
  email: string | null;
  minFunding: number | null;
  maxFunding: number | null;
}

export async function listFundersForAdmin(): Promise<AdminFunderRow[]> {
  const supabase = getSupabaseServer();
  const { data: funders, error: fundersError } = await supabase
    .from("funders")
    .select("id, name, relationship_status, iso_agreement_signed")
    .order("name");

  if (fundersError || !funders?.length) return [];

  const ids = funders.map((f) => f.id);
  const [contactsResult, guidelinesResult] = await Promise.all([
    supabase.from("funder_contacts").select("funder_id, email").in("funder_id", ids),
    supabase.from("funder_guidelines").select("funder_id, min_funding, max_funding").in("funder_id", ids),
  ]);
  const contacts = (contactsResult.data ?? []) as { funder_id: string; email: string | null }[];
  const guidelines = (guidelinesResult.data ?? []) as { funder_id: string; min_funding: number | null; max_funding: number | null }[];

  const emailByFunder = new Map(contacts.map((c) => [c.funder_id, c.email ?? null]));
  const guidelineByFunder = new Map(guidelines.map((g) => [g.funder_id, g]));

  return funders.map((f) => {
    const g = guidelineByFunder.get(f.id);
    return {
      id: f.id,
      name: f.name ?? "",
      relationshipStatus: f.relationship_status ?? "active",
      isoAgreementSigned: f.iso_agreement_signed === true,
      email: emailByFunder.get(f.id) ?? null,
      minFunding: g?.min_funding ?? null,
      maxFunding: g?.max_funding ?? null,
    };
  });
}
