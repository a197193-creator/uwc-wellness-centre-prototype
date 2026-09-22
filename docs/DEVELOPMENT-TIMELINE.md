# UWC Website Prototype — Development Timetable

**Prepared:** 22 September 2026

**Review build:** 2 October 2026

**UWC meeting:** 7 October 2026

| Date | Planned work | Deliverable / status |
| --- | --- | --- |
| 21–22 September | Confirm requirements, customer fields, About UWC information and appointment rules | **Completed 22 September.** Requirements and current-site gap check recorded in `docs/UWC-PROTOTYPE-REQUIREMENTS.md`. |
| 23 September | Develop About UWC navigation and information section | **Completed early on 22 September.** Added the responsive About section, accreditation wording, contacts and links. Replaced the outdated four-package catalogue with the confirmed RM150 package and nine add-ons, and added custom-selection/package-offer comparison logic. |
| 24–25 September | Develop customer-details form, validation and privacy notice | Validated fields, accessible errors, approved consent text and session-only prototype handling. Complete confirmed catalogue reconciliation if required. |
| 26–27 September | Contingency / self-review | No formal UWC review required; use only if earlier development needs correction or extra testing. |
| 28–29 September | Develop appointment date and time-selection interface | Weekday/date rules, demonstration time slots, duration and cancellation notices. |
| 30 September | Integrate the complete journey from package selection to confirmation | End-to-end staged journey with editing and retained state. |
| 1 October | Conduct responsive, accessibility and functional testing | Mobile/desktop, keyboard, validation, totals, navigation and console checks. |
| 2 October | Deploy and share the feature-complete review version | Stable public review URL and concise review checklist. |
| 3–4 October | Review buffer for UWC and supervisor comments | Consolidated feedback list; no meeting-critical feature work planned. |
| 5 October | Implement consolidated feedback and corrections | Agreed corrections completed; avoid new scope unless essential. |
| 6 October | Complete final testing, deployment and demonstration preparation | Final deployment, demo script and fallback screenshots/notes. |
| 7 October | Present the updated prototype during the UWC meeting | Demonstrate the approved journey and record follow-up decisions. |

## Review buffer policy

The main feature work is targeted for completion on 2 October, leaving 3–6 October for review, correction and final preparation. New features requested during the buffer should be separated into meeting-critical changes and post-meeting enhancements so that the demonstration remains stable.

## Known dependency checkpoints

- **23 September:** Use the supervisor-approved About UWC wording and contact details.
- **Catalogue integration:** Completed 22 September with the confirmed RM150 package, nine add-ons and package-match offer.
- **Before appointment development:** Treat 30-minute slots as a clearly labelled prototype assumption.
- **Before adding preparation advice:** Obtain exact approved instructions from UWC; do not invent medical preparation guidance.
- **Before 2 October deployment:** Confirm that the public URL loads without sign-in and that the Vercel production build is successful.
