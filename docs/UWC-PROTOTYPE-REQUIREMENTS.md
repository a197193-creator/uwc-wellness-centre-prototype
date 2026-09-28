# UWC Website Prototype — Confirmed Requirements

**Status:** Confirmed for prototype development

**Requirements checkpoint:** 22 September 2026

**Feature-complete review target:** 2 October 2026

**UWC meeting:** 7 October 2026

## 1. Source of truth and prototype boundary

These requirements reflect the supervisor's written confirmation received on 22 September 2026. If an older worksheet, poster or version of the website conflicts with this document, the confirmed information below takes priority until UWC provides a newer written instruction.

The 7 October version is a front-end prototype. It may demonstrate selection, customer details, appointment choice, review, payment and confirmation, but it must not:

- create a real appointment or order;
- process a real payment or request card/bank information;
- transmit customer information to UWC;
- store identification numbers, medical history or other unnecessary sensitive information; or
- imply that a preferred appointment is confirmed.

### Agreed implementation technologies

Use standard HTML, CSS, JavaScript and PHP so the project remains understandable and maintainable using the technologies already covered in the student's coursework. Avoid introducing a front-end framework unless a later requirement genuinely needs one. PHP may provide read-only or future server-side functions, but the approved prototype must not transmit customer details or process bookings/payments.

## 2. Confirmed customer journey

The approved journey is:

**Select package/tests → Review plan → Customer details → Select appointment → Final review → Payment preview → Confirmation**

Users must be able to go back and edit an earlier stage without losing their current selections during the active browser session. The final review must clearly summarize the selected services, indicative total, customer contact details and preferred appointment before the payment preview.

## 3. About UWC

### Navigation and presentation

- Add **About UWC** to the main navigation.
- The navigation item must lead to a concise, readable section on the same website.
- Include UWC's background, role, services, audience, location, contact details and laboratory accreditation statement.
- Provide a link to the official UWC website for further information.

### Approved introduction

> **About UMBI Wellness Centre (UWC)**
>
> UMBI Wellness Centre (UWC), also known as Pusat Saringan Kesihatan UMBI, is a health-screening centre operated by the UKM Medical Molecular Biology Institute (UMBI), Universiti Kebangsaan Malaysia. UWC provides accessible and affordable health-screening services to support the early detection of health risks and enable individuals to better understand and monitor their health status. Its services include laboratory investigations, physical and body-composition measurements, cardiovascular and respiratory assessments, as well as a range of optional health-screening tests. Guided by the principle “Detect Early, Stay Healthy,” UWC encourages regular health screening as an important step towards early intervention, informed health decisions and improved quality of life.
>
> UWC is located at UMBI, UKM, Jalan Yaacob Latiff, Bandar Tun Razak, 56000 Cheras, Kuala Lumpur. Its health-screening services are available to UKM staff, students and members of the public, subject to prior appointment and the applicable service arrangements.

### Approved accreditation wording

> Laboratory analyses associated with UWC health-screening services are performed using the laboratory facilities supporting The Malaysian Cohort project at UMBI, UKM. The laboratory operates under an MS ISO 15189-accredited medical laboratory quality system, supporting the quality, reliability and competency of the laboratory testing processes within its accredited scope.

The phrase **“within its accredited scope”** must be retained.

### Official contact details

| Channel | Confirmed information |
| --- | --- |
| Appointment hotline | 1-800-88-2007 |
| Mobile / WhatsApp | 010-315 6405 |
| Email | umbiwellness@gmail.com |
| Address | UMBI, UKM, Jalan Yaacob Latiff, Bandar Tun Razak, 56000 Cheras, Kuala Lumpur |
| Facebook | https://www.facebook.com/umbi.wellness/ |
| Instagram | https://www.instagram.com/umbi.wellness/ |
| Website | https://www.ukm.my/umbi/wellness/ |

Telephone, WhatsApp, email and external web links should be actionable where the browser supports them.

## 4. Proposed precision-screening catalogue

The RM150 Standard Health-Screening Package was removed from the prototype on 22 September at the student's request. The catalogue now presents the four supplied precision packages and their proposed à la carte comparisons.

| Package | Current range | Supplied à la carte total | Proposed package price | Supplied saving / difference |
| --- | ---: | ---: | ---: | ---: |
| 1. Precision Baseline Health Screening | RM350–RM500 | RM590 | RM450 | RM140 |
| 2. Precision Expanded Health Screening | RM1,500–RM2,500 | RM1,660 | RM1,800 | -RM140 |
| 3. Precision Wellness and Health Status | RM3,500–RM5,500 | RM4,958 | RM4,200 | RM758 |
| 4. Precision Longevity | RM6,000–RM12,000+ | RM17,796 | From RM7,500 | RM10,296 |

Package 1 lists InBody/body composition, ECG, spirometry, the basic blood package, HbA1c and UACR/ACR. Package 2 carries Package 1 forward and adds whole-body DEXA, vitamin D, retinal/AI fundus screening, SENS wearable assessment, skin-age analysis and an integrated annual health report. Package 3 carries Packages 1–2 forward and adds BNP, troponin, extended lipids, cystatin C, fasting insulin/HOMA-IR, DEXA BMD, MoCA, 25 trace elements and combined vitamin A & E. Vitamin D and retinal screening must not be charged twice.

Package 4 carries Packages 1–3 forward and presents targeted DNA, WES, WGS, gut microbiome, pharmacogenomics, genomic interpretation and repeat-monitoring pathways. RM7,500 is a proposed starting price based on the targeted-panel pathway; WES, WGS and pharmacogenomics can materially change the final quotation.

Prices marked with an asterisk are working/prototype prices pending a specific quotation or final service definition. The Package 2 comparison is negative: RM1,800 is RM140 above its RM1,660 supplied component total. The supplied Package 3 and 4 totals must also be validated against the final component definitions and UWC costing before commercial use.

Display this notice near catalogue pricing:

> Packages, pathways, services and prices are proposed prototype figures and remain subject to UWC costing, clinical review and confirmation.

First-time customers are not required to choose a particular package. They may select a package or build a custom selection according to their preferences and screening needs.

### Completed catalogue migration

The website now opens each package to show its cumulative components, à la carte total, proposed package price, difference and rationale. The Build Your Own catalogue uses the same proposed component prices and identifies when a custom selection matches one of the four packages.

## 5. Customer details

| Field | Required | Prototype validation |
| --- | :---: | --- |
| Full name | Yes | At least two letters; letters, spaces, apostrophes and hyphens only |
| Contact number | Yes | 7–15 digits with one optional leading `+`; other characters are removed during entry |
| Email address | Yes | Valid email format |
| Preferred contact method | Yes | Phone call, WhatsApp or Email |
| First-time customer status | Yes | Yes or No |
| Booking notes | No | Plain text with a visible character limit |
| Booking/privacy consent | Yes | Mandatory unchecked checkbox |

Do not collect identification numbers, dates of birth, medical history, diagnoses, payment credentials or uploaded documents in this prototype.

Use suitable browser autocomplete attributes for name, telephone and email. Validation messages must identify the specific field and explain how to correct it; colour alone must not communicate an error.

## 6. Privacy and booking consent

Display the approved notice in full:

> By submitting this booking request, I confirm that the information provided is accurate and consent to UWC using my contact and booking information to arrange, manage and communicate matters relating to my health-screening appointment. I understand that my information will be handled in accordance with the applicable privacy and data-protection requirements.

Display this mandatory checkbox, unchecked by default:

> I have read and agree to the booking and privacy notice.

For the prototype, customer details must remain in the active browser experience only and must not be transmitted to a server, analytics service or live booking system. The interface must plainly state that submitting the demonstration does not send a booking to UWC.

## 7. Appointment rules

### Confirmed business information

- Appointments are available Monday to Friday, excluding public holidays.
- Appointment hours are 8:00 a.m. to 10:00 a.m.
- A visit may take approximately 30 minutes to 2 hours, depending on the selected screening package or services.
- Customer capacity must not be displayed.

Display this duration notice:

> Please allow approximately 30 minutes to 2 hours for your visit, depending on the selected screening package or services.

Display this cancellation/rescheduling notice:

> Customers may request to cancel or reschedule their appointment at any time. However, customers are encouraged to notify UWC at least a day before the scheduled appointment date, whenever possible.

### Prototype appointment behaviour

- Offer future dates only; past dates and weekends must not be selectable.
- Public holidays must be excluded through a configurable list. The holiday list/source must be confirmed before production use.
- Show appointment times within the approved 8:00 a.m.–10:00 a.m. window.
- Until UWC confirms the slot interval, use 30-minute demonstration options: 8:00, 8:30, 9:00, 9:30 and 10:00 a.m.
- Label the selected date/time as a **preferred appointment**, not a confirmed booking.
- Do not show remaining places or imply real-time availability.

The 30-minute interval and inclusion of 10:00 a.m. as a start time are prototype assumptions, not confirmed operational rules.

## 8. Review, payment preview and confirmation

- Final review must show every selected service and price, the total, the customer's contact details and preferred appointment.
- Provide clear edit actions for the plan, details and appointment.
- Payment must remain a demonstration only.
- Do not show functional card, online-banking or e-wallet fields.
- State clearly: **No charge will be made and no booking will be submitted.**
- The confirmation screen must continue to identify the transaction as a prototype demonstration.
- Preparation instructions such as fasting or items to bring must not be invented. Add them only after UWC confirms the wording.

## 9. Current prototype gap check — 22 September 2026

| Requirement | Current state | Required action |
| --- | --- | --- |
| About UWC navigation/content | Completed 22 September | Review wording/layout with UWC |
| Official contacts | Completed 22 September | Confirm links during final testing |
| Accreditation statement | Completed 22 September | Retain exact approved wording |
| Four precision packages | Updated 22 September | Validate proposed component totals, working prices and pathways with UWC |
| Custom selection/package comparison | Updated 22 September | Uses the supplied à la carte totals and flags the negative Package 2 difference |
| Review plan | Adapted to confirmed catalogue | Extend into the new staged journey |
| Customer details | Missing | Build form and validation |
| Privacy notice/consent | Missing | Add exact notice and mandatory checkbox |
| Appointment selection | In progress 28 September | Weekday/date and morning-time prototype added; confirm holiday exclusions and final slot rules with UWC |
| Final review | Partial | Expand to include customer and appointment information |
| Payment preview | Present | Keep demonstrational; update wording and sequence |
| Confirmation | Missing as a full stage | Add prototype confirmation state |

## 10. Inputs still needed before production implementation

### Progress update — 25 September 2026

The customer-details form, field validation and approved booking/privacy notice are implemented. The user can review a selected plan, enter and save details for the current page session, return to edit the plan, and reopen the form without losing the entered values. Form submission does not send a request to UWC. The preferred appointment, final review, payment preview and confirmation stages remain scheduled for their later dates in the timetable. The newer four-package precision catalogue remains in place as directly requested after the earlier RM150 poster guidance.

### Progress update — 28 September 2026

The preferred-appointment prototype step now follows valid customer details. It offers the next 15 future weekdays in Kuala Lumpur time and the five proposed morning choices, and saves the preference only in the active page session. The interface includes the agreed duration and cancellation/rescheduling notices and states that no availability or booking is confirmed. Public-holiday exclusions are configurable but await UWC's approved list; final slot interval and whether 10:00 a.m. can start an appointment also remain open. The 29 September refinement and 30 September final-review/payment/confirmation integration are not marked complete.

These items do not block the 7 October prototype, but they must be confirmed before a live system is launched:

- official public-holiday source or maintained list;
- final appointment slot interval, lead time and whether 10:00 a.m. is a valid start time;
- real availability/capacity and the staff process used to approve a request;
- approved fasting, preparation and items-to-bring instructions for each service;
- final privacy notice and data-retention policy;
- destination system/email/database for real booking requests;
- payment provider, financial workflow, refund rules and security review; and
- final confirmation of the poster/services/prices if UWC issues a newer version.

## 11. Definition of complete for the 2 October review build

The review build is feature-complete when a user can:

1. open About UWC and read the approved information;
2. select one of the four proposed precision packages and/or individual components;
3. review the selection and indicative total;
4. enter and validate the approved customer fields;
5. choose an eligible preferred appointment date and time;
6. review and edit all entered information;
7. view a clearly non-functional payment preview; and
8. reach a confirmation screen that states no real booking or payment occurred.

The journey must work at common mobile and desktop widths, with keyboard access, visible focus indicators, useful field labels and no blocking browser-console errors.
