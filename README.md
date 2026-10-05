# UWC Website Project

Public prototype: https://uwc-wellness-centre-prototype.vercel.app/

This folder contains the editable website source and the matching production files from the deployed prototype.

This Desktop folder is the main working project. Make future edits here and publish from here. Copies under Documents/Codex are older archives or delivery copies.

## Project documentation

- `docs/UWC-PROTOTYPE-REQUIREMENTS.md`: confirmed scope, approved content, booking rules and acceptance criteria as of 22 September 2026
- `docs/DEVELOPMENT-TIMELINE.md`: dated implementation, review and meeting timetable

## Technology used

The project stays within the technologies used in the student's coursework:

- **HTML5** for page structure and accessible content
- **CSS3** for layout, responsive design and visual styling
- **JavaScript** for catalogue interaction and the prototype journey
- **PHP** for a small server-side prototype-status endpoint and, after UWC approval, future booking-side processing

The PHP endpoint does not receive or store customer information. The public journey can submit **demo appointment requests** with test details to Supabase and issue a tracking code, but cannot reserve real UWC appointments or take payment. The admin screen is a separate fictional UI preview; it does not access those submitted requests.

- `index.html`: page structure and text
- `styles.css`, `enhancements.css` and `readability.css`: design, responsive styles and larger text
- `catalogue.js`: screening packages, test catalogue and pricing logic
- `icons.js`: screening pictograms used for package inclusions and individual tests
- `pdf.js`: branded A4 review-summary PDF generated locally in the browser
- `app.js`: package selection, plan totals, customer details and preferred-appointment demonstration
- `appointment-rules.js`: shared Malaysia-time weekday, morning-slot and three-month rules
- `api/prototype-status.php`: read-only PHP endpoint identifying the site as a non-transactional prototype
- `assets/`: official UWC photographs, retained UMBI/TMC screening photographs and the website mark
- `PHOTO-SOURCES.md`: photograph provenance and original source links
- `build.ps1`: refreshes the ready-to-publish `dist` folder from the current source
- `dist/`: built website copy retained for the publishing workflow
- `vercel.json`: Vercel configuration for the PHP prototype-status endpoint
- `track/`, `track.js`: guest booking-code lookup for submitted demo requests and fictional samples
- `admin/`, `admin.js`: standalone fictional staff dashboard preview with public demo credentials
- `demo.css`, `demo-config.js`: shared demo styling and public-only Supabase configuration
- `supabase/migrations/`: SQL schema, RLS policies, sample rows, and audited admin functions
- `supabase/functions/booking-gateway/`: rate-limited, code-based guest lookup and change response
- `docs/DEMO-SETUP.md`: demo login, security boundaries and end-to-end test instructions
- `docs/UWC-REVIEW-2026-10-05.md`: correction list and recorded technical regression results

## Preview locally

From this folder, run `npx --yes http-server . -p 8000 -c-1`, then open http://localhost:8000/.

## Update and publish

Edit the root source files, then run `powershell -ExecutionPolicy Bypass -File .\build.ps1` from this folder to refresh `dist`. Push changes to the connected GitHub `main` branch to update the existing Vercel project and the public URL above. Do not create a separate Vercel project or share a deployment-specific URL for routine updates.

The public journey is package or test selection → customer details → preferred appointment → final review → demo request confirmation and code. Customers can submit another demo request without waiting for the first one to finish. No payment or real appointment is made. Submitted test details are stored in the prototype database; the selected plan is also saved in browser storage. Prices are proposed and subject to UWC confirmation. The code tracker reads submitted demo requests; the admin dashboard uses separate fictional sample records and cannot change the tracker status.

This shareable copy excludes Git history, hosting account metadata and unused concept images.
