# Funder shortlist matching

How we map a **new application** to the **funder list** to produce a shortlist (matched funders).

## Data used

- **Application:** `merchant_applications` — `state`, `industry`, `monthly_revenue`, `funding_request` (and optionally more from `funder_guidelines` in the future).
- **Funder rules:** `funder_guidelines` — one row per funder with eligibility filters.

## Matching rules

A funder is **matched** (on the shortlist) when **all** of the following that are set on their guidelines pass:

| Guideline field     | Application field   | Rule |
|---------------------|---------------------|------|
| `states_excluded`   | `state`             | Application state must **not** be in this list (e.g. no TX). |
| `states_allowed`    | `state`             | If set, application state must be **in** this list. |
| `industries`        | `industry`          | If set, application industry is matched (substring / list). |
| `revenue_min`       | `monthly_revenue`   | Parsed to number; must be ≥ guideline value. |
| `revenue_max`       | `monthly_revenue`   | Parsed to number; must be ≤ guideline value. |
| `min_funding`       | `funding_request`   | Parsed to number; must be ≥ guideline value. |
| `max_funding`       | `funding_request`   | Parsed to number; must be ≤ guideline value. |

- **Currency parsing:** `monthly_revenue` and `funding_request` from the form are text (e.g. `"$50,000"`, `"50000"`). We strip `$`, commas, and spaces, then parse as a number. Invalid or empty values are treated as “no constraint” for that side (min/max).
- **State:** Compared as uppercase; `states_allowed` / `states_excluded` in the DB should use consistent codes (e.g. `TX`, `NY`).
- **Industry:** If `funder_guidelines.industries` is an array of strings, we check whether the application’s industry (lowercased) matches or is included. Format may be extended later (e.g. JSONB with labels/codes).

## Where it’s used

- **Submit-to-funders page:** When you select an application, the funder list is refetched with that `applicationId`. Funders that match the rules above get **Shortlist** shown next to their name. You can still select any funder (shortlist or not); the badge is for guidance.
- **Summary email:** The email to subs@onedaycap.com includes a “Shortlist match” column (Yes/No) for each recipient so you know who was matched vs manually added.

## Adding more criteria

To use more columns (e.g. `min_time_in_biz`, `min_fico_score`, `first_position`), add the application fields to the merchant form and DB if needed, then extend `getMatchedFunderIds()` in `app/actions/submit-to-funders.ts` with the same “if guideline is set, application must pass” logic.
