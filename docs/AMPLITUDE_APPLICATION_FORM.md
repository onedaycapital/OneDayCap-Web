# Amplitude – Application Form Events

All application form events include `source: "application_form"` so you can filter in Amplitude.

## Campaign links (rid)

Campaign URLs use the format **`www.onedaycap.com/?rid={{rid}}`**. When a user lands with `?rid=` in the URL:

1. **First touch:** We store `rid` in sessionStorage, set Amplitude **user id to `rid`**, and track **"Campaign Link Visited"** (properties: `rid`, `source: "campaign"`, `referrer`).
2. **All later events:** Every application form event includes **`campaign_rid`** when present, so you can attribute conversions to campaigns.
3. **After they enter email:** We set user id to **email** so the rest of the funnel is under one user. Events still carry `campaign_rid` for attribution.

In Amplitude you can segment by **User ID = rid** (for the visit) or by event property **`campaign_rid`** to see campaign-driven application funnels.

## User ID

- **From campaign:** If the user landed with `?rid=`, we set `setUserId(rid)` immediately so they are identified from first touch.
- **Set from email:** When the user enters an email (Step 1) and moves forward, we call `setUserId(email)`. You can identify users by email in Amplitude and segment by it.
- **Returning users:** When we restore from abandoned progress, we set the user ID to that email before firing events.

## Events

| Event | When | Key properties |
|-------|------|----------------|
| **Campaign Link Visited** | User landed on the site with `?rid=` in the URL. | `rid`, `source: "campaign"`, `referrer`. User ID set to `rid`. |
| **Application Form Started** | User lands on the application form (mount). | `step: 1`, `step_name: "Email"` |
| **Application Step Viewed** | User is on a step (on load and every time the step changes). | `step` (1–5), `step_name` |
| **Application Step Completed** | User clicked Next and moved to the next step. | `from_step`, `to_step`, `step_name`; on Step 1 also `lookup_source: "staging" \| "none"` |
| **Application Step Validation Failed** | User clicked Next but validation failed (required fields, etc.). | `step`, `step_name`, `validation_error` |
| **Application Restored From Abandoned** | User returned and we loaded saved progress. | `restored_to_step: 2`, `previous_last_step` |
| **Application Session Ended** | User left the page (tab close, navigate away, refresh). | `step`, `step_name`, `abandoned_at_step` |
| **Application Form Submitted** | Form submitted successfully. | `application_id`, `step: 5` |
| **Application Form Submit Failed** | Submit to server failed. | `error` |

## How to use in Amplitude

1. **User ID = email**  
   In User Look-Up or cohort filters, use the Amplitude User ID; it is set to the applicant’s email once they pass the email step.

2. **Funnel: step progression**  
   - Event sequence: `Application Form Started` → `Application Step Viewed` (step 1) → `Application Step Completed` (1→2) → `Application Step Viewed` (step 2) → … → `Application Form Submitted`.  
   - Build a funnel on these events (or on `Application Step Completed` with `to_step`) to see drop-off by step.

3. **Where they abandon**  
   - Use **Application Session Ended** and group by `abandoned_at_step` (or `step`) to see at which step users leave.  
   - Compare with **Application Step Viewed** / **Application Step Completed** to see friction (e.g. many Step Viewed 3 but few Step Completed 3→4).

4. **Validation friction**  
   - Filter on **Application Step Validation Failed** and break down by `step` or `validation_error` to see which steps and messages cause the most failures.

5. **Returning users**  
   - Filter on **Application Restored From Abandoned** and use `previous_last_step` to see where they had stopped before.

6. **Campaign attribution**  
   - **Campaign Link Visited** fires when someone lands with `?rid=`. User ID is set to `rid` so you can identify that visitor.
   - Segment by event property **`campaign_rid`** to see all events from users who came via a campaign link (including form steps and submit).
   - Your CSV has `rid` = email per recipient; in Amplitude, User ID will be that `rid` on first touch, then email once they enter it on the form—so you can match back to your upload.

All events are prefixed with `Application ` (or **Campaign Link Visited**) and have `source: "application_form"` or `source: "campaign"` for easy filtering.
