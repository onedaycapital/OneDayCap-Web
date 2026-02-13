# Funder inbound email – auto-update outcomes (Phase 2)

**Goal:** When a funder replies to our submission email, (1) you see the reply in your real inbox and can respond (human-in-the-loop first), and (2) optionally we also get a copy to link the reply to the right submission and update `submission_events` / status.

**Principle:** Replies must land where you read email. Automation must not redirect replies away from your inbox. If we don’t process a reply or the system misses a case, the deal must not sit at risk for lack of attention — you’ll have already seen the email.

---

## 1. Human-in-the-loop first

- **Reply-To** on funder emails = **your real inbox** (e.g. `subs@onedaycap.com` or the address you actually use). When a funder hits “Reply”, the message goes to you. You read it, follow up, negotiate. No reply is “only” in the system.
- Automation is **additive**: we get a **copy** of replies (via an inbox forward rule) and process that copy. The original stays in your inbox. If the forward or our parsing fails, you still have the reply and can use a manual “log outcome” form.

---

## 2. How reply matching works (when we do have a copy)

- When **we send** a funder email, we set a **Message-ID** header (e.g. `<uuid@mail.onedaycap.com>`) and store it in `submission_messages.message_id`.
- When the **funder replies**, their client sets **In-Reply-To** to that Message-ID. So when we receive a **copy** of that reply (e.g. via Resend), we can match **In-Reply-To** to `submission_messages.message_id` and know which `funder_submission` it belongs to.
- We then parse the body (keyword or later LLM) to set `event_type`: `replied` | `declined` | `offered`, and optionally update status / decline reason / offers.

---

## 3. Recommended flow: inbox first, copy for automation

1. **When we send to a funder**  
   - Set **Message-ID** (custom header) and store it in `submission_messages.message_id`.  
   - Set **Reply-To** to **your real inbox** (e.g. `subs@onedaycap.com`). Do **not** send replies only to a Resend address.

2. **Getting a copy for the system**  
   - In the mailbox where you receive replies (e.g. Gmail/Outlook for subs@onedaycap.com), add a rule: **“Forward a copy of each incoming message to …”** a Resend receiving address (e.g. `process-replies@<your-id>.resend.app`).  
   - So: original reply → your inbox (you see it and act). Copy → Resend → webhook → we match by In-Reply-To and update submission_events. If the copy never arrives or we don’t handle it, you still have the original.

3. **Webhook handler (when Resend receives the copy)**  
   - Verify webhook, fetch full email (headers + body), match In-Reply-To to `submission_messages`, insert inbound `submission_message` + `submission_events`, optionally update `funder_submissions.status`.  
   - Idempotency: dedupe by inbound message id so the same forward isn’t processed twice.

4. **Manual fallback**  
   - Keep a “log outcome” form: choose submission → set status (replied / declined / offered), optional decline reason, add offer, mark funded. Use it whenever automation didn’t run or you want to correct/override.

---

## 4. Alternative: no inbound automation

- **Reply-To** = your inbox only. No forward rule.  
- You read every reply and use the **manual “log outcome”** form to record status, offers, and funded deals.  
- Zero risk of “reply went to the system and I never saw it”; automation is entirely manual.

---

## 5. Implementation checklist (inbox-first + optional automation)

- [ ] **Send path**  
  - Set **Message-ID** when sending funder emails; store it in `submission_messages.message_id`.  
  - Set **Reply-To** to your real inbox (e.g. subs@onedaycap.com).  

- [ ] **Your inbox**  
  - Add rule: forward a copy of incoming mail to a Resend receiving address (if you want automation).  

- [ ] **Resend receiving + webhook**  
  - Turn on receiving for that address; add `email.received` webhook → e.g. `POST /api/webhooks/inbound-email`.  
  - Handler: fetch email, match In-Reply-To, insert inbound message + submission_events, optional status/decline/offer.  

- [ ] **Manual “log outcome” form**  
  - Internal page or form: pick submission → set status / decline reason / add offer / mark funded. Always available regardless of inbound automation.

---

## 6. Process: “forward a copy” and what gets recorded

### 6.1 Setting up “forward a copy”

**Where you read funder replies:** e.g. Gmail or Outlook for `subs@onedaycap.com`.

**Goal:** Every incoming email to that mailbox is also sent as a **copy** to an address that Resend receives, so our app can process it.

| Step | What you do |
|------|-------------|
| 1 | In Resend: turn on **Receiving** and get a receiving address (e.g. `process-replies@<your-id>.resend.app`). Add the `email.received` webhook pointing to your app (e.g. `https://your-site.com/api/webhooks/inbound-email`). |
| 2 | In **Gmail** (the account that gets funder replies, e.g. subs@onedaycap.com): create a **filter** that forwards a copy to the Resend address. See **Gmail steps** below. |
| 3 | Result: when a funder replies, (a) the reply stays in your Gmail inbox, (b) a copy is sent to the Resend address, (c) Resend receives it and POSTs to your webhook. |

**Gmail steps (forward a copy to Resend):**

1. In Gmail, click the **gear** → **See all settings**.
2. Open the **Filters and Blocked Addresses** tab.
3. Click **Create a new filter**.
4. Set the filter (choose one):
   - **All mail to this account:** leave “To” as your address (e.g. `subs@onedaycap.com`) if this inbox only gets funder replies.
   - **Only funder replies:** e.g. “To: subs@onedaycap.com” and “Subject: Re: New Application” (so only replies to our submission emails are copied).
5. Click **Create filter**.
6. Check **Forward it to:** and choose (or add) the Resend receiving address, e.g. `process-replies@<your-id>.resend.app`.
7. Optionally check **Also apply filter to matching conversations** to run it on existing threads.
8. Click **Create filter**.

**First-time forward in Gmail:** If the Resend address isn’t in the list, pick **Add a forwarding address**, enter it, then confirm the verification email Gmail sends to that address (you may need to open Resend’s receiving logs or use a one-time verification link). After that, the filter can use it.

You can narrow the filter (e.g. subject contains “New Application”) so only funder-related replies are copied.

---

### 6.2 What happens when the copy reaches our system

| Step | What the app does |
|------|-------------------|
| 1 | Webhook receives `email.received` with `email_id`. Verifies Resend signature. |
| 2 | Calls Resend “Retrieve received email” API → gets **headers** (In-Reply-To, References) and **body** (text/html). |
| 3 | Looks up `submission_messages` where `message_id` matches **In-Reply-To** (or is in References). → Gets `funder_submission_id` (and thus funder, merchant application). |
| 4 | Inserts **submission_messages** (direction = `inbound`): from, to, body snippet or ref, so we have a full audit of the reply. |
| 5 | **Parses** the body (keyword rules or later LLM): infers event type → `replied` | `declined` | `offered`. |
| 6 | Inserts **submission_events**: `funder_submission_id`, `event_type`, `occurred_at`, optional `submission_message_id` (the inbound message we just inserted). If we infer “declined”, can set **decline_reason_id** if we match a phrase to `decline_reasons`. If we infer “offered”, can create a **funder_offers** row (factor, term, holdback, etc.) if we parse numbers from the email, or leave a “pending” placeholder for you to fill in. |
| 7 | Optionally updates **funder_submissions.status** (e.g. to `declined` or `offered`). |
| 8 | Idempotency: if we’ve already processed this inbound message id (or a hash of it), skip so we don’t double-record. |

So from the **forwarded copy** we can record: **who** (funder + submission), **that** they replied/declined/offered, **why** (decline_reason_id when we can match), and **what offer** (funder_offers row when we can parse terms).

---

### 6.3 What we record automatically vs what you add manually

| Data | From forwarded copy (auto) | From you (manual) |
|------|----------------------------|-------------------|
| **Who replied** | Yes — matched via In-Reply-To to a submission (funder + application). | — |
| **That they replied / declined / offered** | Yes — we infer from body and write submission_events + optional status. | You can correct or add via “log outcome” if we missed or misclassified. |
| **Why they declined** | Maybe — if we map phrases to `decline_reasons`. | Yes — “log outcome” form: pick submission → set decline reason. |
| **What offer (factor, term, holdback)** | Maybe — if we parse numbers from the email. | Yes — “log outcome” form: pick submission → “Add offer” → enter factor, term, holdback, etc. (or confirm/edit an auto-created row). |
| **Which offer was accepted** | No — that’s a later decision (merchant + funder close the deal). | Yes — “log outcome” or “close deal”: pick submission and the specific **funder_offer** that was accepted (or enter terms if no offer row). |
| **Funded deal** | No. | Yes — “Close deal”: link application + funder + accepted offer (optional) + funded amount + date. Creates **funded_deals** row. |
| **Commission (expected/paid)** | No. | Yes — “Commission” form or table: for a funded deal, record expected amount, paid amount, payment method, reference, date. Creates **commission_ledger** rows. |

So: the **forwarded copy** gives us “who replied and whether it was a reply / decline / offer,” and optionally “why” and “what offer” when we can parse it. **Who made what offer** is either parsed into `funder_offers` or you add it manually. **Which offer is accepted** and **funded deal + commission** are always you (or a later internal flow) recording them in the system.

---

### 6.4 End-to-end lifecycle in the system

1. **Send** → We create `funder_submissions` + outbound `submission_messages` (with Message-ID) + `submission_events` (event_type = `sent`).
2. **Funder replies** → Copy is forwarded to Resend → webhook → we match reply to submission, insert inbound `submission_message`, insert `submission_events` (replied / declined / offered), optionally `decline_reason_id` and/or `funder_offers` row. You see the original in your inbox and can respond; you can also use “log outcome” to fix or add details.
3. **You negotiate** → More back-and-forth (we can record more inbound messages/events if you keep forwarding copies), or you add/update **funder_offers** manually (e.g. counter-offers).
4. **Deal closes** → You record: this submission’s **offer** (or the one you’re accepting) is accepted → create **funded_deals** (application + funder + that offer + funded amount + date). Optionally mark the **funder_offer** status as `accepted`.
5. **Commission** → You record in **commission_ledger** for that funded deal: expected amount, paid amount, payment method, reference, date.

So the **process** is: set up the inbox forward so a copy of every (or every funder) reply goes to Resend → our webhook records who replied and what kind of response (replied/declined/offered), and optionally why and what offer → you use the “log outcome” form to fill in or correct decline reason, offer terms, which offer was accepted, funded deal, and commission.

---

## 7. Summary

- **Replies go to your inbox first.** Reply-To = your real address. Human-in-the-loop is preserved.
- **Forward a copy:** Inbox rule sends a copy of each (or each funder) reply to a Resend receiving address → webhook → we match by In-Reply-To and record: who replied, replied/declined/offered, optional decline reason and offer terms.
- **You fill the gaps:** “Log outcome” form for decline reason, offer details, which offer was accepted, funded deal, and commission. That way we record who made what offer, which offer is accepted, who rejected and why, and funded/commission state in one place.
