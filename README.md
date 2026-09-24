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

The PHP endpoint does not receive or store customer information. The current prototype must not submit real bookings or payments.

- `index.html`: page structure and text
- `styles.css`, `enhancements.css` and `readability.css`: design, responsive styles and larger text
- `catalogue.js`: screening packages, test catalogue and pricing logic
- `icons.js`: screening pictograms used for package inclusions and individual tests
- `pdf.js`: branded A4 review-summary PDF generated locally in the browser
- `app.js`: package selection, plan totals and the customer-details demonstration
- `api/prototype-status.php`: read-only PHP endpoint identifying the site as a non-transactional prototype
- `assets/`: official UWC photographs, retained UMBI/TMC screening photographs and the website mark
- `PHOTO-SOURCES.md`: photograph provenance and original source links
- `build.ps1`: refreshes the ready-to-publish `dist` folder from the current source
- `dist/`: ready-to-publish static website
- `netlify.toml`: Netlify settings, with `dist` as the publish directory

## Preview locally

From this folder, run `python -m http.server 4173` if Python is installed, then open http://localhost:4173/.

## Update and publish

Edit the root source files, then run `powershell -ExecutionPolicy Bypass -File .\build.ps1` from this folder to refresh `dist`. The current public prototype is hosted on Vercel at the URL above. The project is a static site and can be deployed from the repository root; the included Netlify configuration remains available for a `dist`-based deployment if needed.

The current journey reaches the customer-details stage. Appointment selection and the subsequent demonstration stages are scheduled separately. No real booking or payment is submitted. Customer details are kept only in the active page session and cleared on reload; the selected plan uses browser storage. Prices are proposed and subject to UWC confirmation.

This shareable copy excludes Git history, hosting account metadata and unused concept images.
