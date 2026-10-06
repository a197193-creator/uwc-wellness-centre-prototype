# UWC Website Prototype — Development Timetable

**Prepared:** 22 September 2026

**Review build:** 2 October 2026

**UWC meeting:** 7 October 2026

| Date | Planned work | Deliverable / status |
| --- | --- | --- |
| 21–22 September | Confirm requirements, customer fields, About UWC information and appointment rules | **Completed 22 September.** Requirements and current-site gap check recorded in `docs/UWC-PROTOTYPE-REQUIREMENTS.md`. |
| 23 September | Develop About UWC navigation and information section | **Completed early on 22 September.** Added the responsive About section, accreditation wording, contacts and links. Updated the catalogue again with the four supplied precision packages, cumulative inclusions, proposed component pricing and package-comparison logic. |
| 24–25 September | Develop customer-details form, validation and privacy notice | **Completed 25 September.** Added the approved fields, inline validation, consent checkbox and privacy wording. Details remain in the current page session and are cleared on reload. The plan now leads to this stage. |
| 26–27 September | Contingency / self-review | No formal UWC review required; use only if earlier development needs correction or extra testing. |
| 28–29 September | Develop appointment date and time-selection interface | **Completed 29 September.** Three-month week/month picker, required date/time validation, gentle motion, responsive layout and booking notices tested. UWC's holiday list and final time rules remain pending for live use. |
| 30 September | Integrate the complete journey from package selection to confirmation | **Completed 30 September.** Package/plan → customer details → preferred appointment → final review → demo request and tracking code. The current flow takes no payment and does not reserve a real appointment. The admin page remains a separate fictional-data preview. |
| 1 October | Conduct responsive, accessibility and functional testing | **Technical regression completed 5 October**, following the partial 1 October checks. Covered submission/tracking, validation, PDF/print, repeat requests, keyboard focus and 320px/390px layouts. Results: `docs/UWC-REVIEW-2026-10-05.md`. UWC acceptance remains separate. |
| 2 October | Deploy and share the feature-complete review version | Review release moved to **5 October** to include the pending appointment/admin corrections. Use the existing public URL: https://uwc-wellness-centre-prototype.vercel.app/ . |
| 3–4 October | Review buffer for UWC and supervisor comments | **Awaiting review.** No new supervisor feedback was recorded in the sheet comments; the user requested the recorded corrections on 5 October. |
| 5 October | Implement consolidated feedback and corrections | **Completed 5 October for recorded corrections.** Malaysia-time rules, admin mobile layout, visible conflict warnings, keyboard focus, protected submission and tracker-response wording/state are corrected and tested. |
| 6 October | Complete final testing, deployment and demonstration preparation | Added the requested Supabase-connected staff dashboard, private staff sign-in/create-account, stored actions, notes/audit history and live-refresh support. Technical checks recorded in `docs/STAFF-DASHBOARD-SETUP.md`. First staff account creation/approval and the final meeting rehearsal remain outstanding. |
| 7 October | Present the updated prototype during the UWC meeting | Demonstrate the approved journey and record follow-up decisions. |

## Review buffer policy

The main feature work is targeted for completion on 2 October, leaving 3–6 October for review, correction and final preparation. New features requested during the buffer should be separated into meeting-critical changes and post-meeting enhancements so that the demonstration remains stable.

## Known dependency checkpoints

- **23 September:** Use the supervisor-approved About UWC wording and contact details.
- **Catalogue integration:** Updated 22 September with four proposed precision packages and package-match comparisons. UWC still needs to validate working prices, Package 2's negative saving and the Package 3–4 totals/pathways.
- **Before appointment development:** Treat 30-minute slots as a clearly labelled prototype assumption.
- **Before adding preparation advice:** Obtain exact approved instructions from UWC; do not invent medical preparation guidance.
- **Before 2 October deployment:** Confirm that the public URL loads without sign-in and that the Vercel production build is successful.
