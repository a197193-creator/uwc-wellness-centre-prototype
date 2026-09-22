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

## 4. Confirmed screening catalogue

### Standard Health-Screening Package — RM150

- Full Blood Count
- Renal Function
- Lipid Profile
- Fasting Blood Glucose
- Urine Analysis
- Body Composition Analysis
- Blood Pressure and BMI
- Anthropometric Measurement
- Electrocardiogram
- Spirometry
- Vascular Screening

### Add-on screenings

| Add-on | Price |
| --- | ---: |
| Urine Albumin | RM20 |
| HbA1c / Diabetic Control | RM30 |
| Bone Density Measurement (DEXA) | RM120 |
| Blood Grouping | RM15 |
| Uric Acid Level | RM20 |
| Vitamin D | RM100 |
| Thyroid Function Test | RM50 |
| Liver Function Test | RM50 |
| Colorectal Cancer Screening (iFOBT) | RM20 |

Display this notice near catalogue pricing:

> Packages, services and prices are subject to confirmation or revision by UWC.

First-time customers are not required to choose a particular standard package. They may freely select from the available packages, individual services or add-on screenings according to their preferences and screening needs.

### Completed catalogue migration

On 22 September, the earlier four “Precision” packages were removed from the visible prototype and replaced with the approved RM150 standard package and nine add-ons. Users may now build a custom selection, and the website identifies when the same 11 package components have been selected. Because UWC has not supplied standalone prices for those 11 components, the exact individual total and saving remain clearly marked as pending rather than being invented.

## 5. Customer details

| Field | Required | Prototype validation |
| --- | :---: | --- |
| Full name | Yes | Non-empty; sensible text length |
| Contact number | Yes | Accept Malaysian and international-style numbers, spaces, `+` and hyphens |
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
| RM150 package and add-ons | Completed 22 September | Standalone component prices still require UWC input |
| Custom selection/package comparison | Completed 22 September | Exact saving appears automatically when all standalone prices are later supplied |
| Review plan | Adapted to confirmed catalogue | Extend into the new staged journey |
| Customer details | Missing | Build form and validation |
| Privacy notice/consent | Missing | Add exact notice and mandatory checkbox |
| Appointment selection | Missing | Add preferred date/time stage and notices |
| Final review | Partial | Expand to include customer and appointment information |
| Payment preview | Present | Keep demonstrational; update wording and sequence |
| Confirmation | Missing as a full stage | Add prototype confirmation state |

## 10. Inputs still needed before production implementation

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
2. select the confirmed standard package and/or add-ons;
3. review the selection and indicative total;
4. enter and validate the approved customer fields;
5. choose an eligible preferred appointment date and time;
6. review and edit all entered information;
7. view a clearly non-functional payment preview; and
8. reach a confirmation screen that states no real booking or payment occurred.

The journey must work at common mobile and desktop widths, with keyboard access, visible focus indicators, useful field labels and no blocking browser-console errors.
