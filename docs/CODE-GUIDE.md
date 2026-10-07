# UWC code guide

The project uses plain HTML, CSS and JavaScript, a small read-only PHP endpoint, and Supabase
for stored demo requests. The short website guide is at `/guide/`.

## Pages

- `index.html`: public introduction, collapsed About UWC, package tabs, build-your-own catalogue,
  photographs, journey explanation, FAQ and footer.
- The same page contains dialogs for plan → customer details → appointment → review → confirmation.
  They are not separate page loads. The confirmation shows the server-issued tracking code.
- `track/index.html`: guest code lookup, safe booking facts, customer-visible staff messages and
  a reply form when changes are requested. No customer account is required.
- `admin/index.html`: staff sign-in, authorised appointment list, filters, summary cards, day view,
  details and action confirmations. Staff setup steps remain an HTML comment, not visible UI.
- `guide/index.html`: small points explaining these pages and where to edit them. It is static;
  it does not load customer records or grant staff access.

## JavaScript responsibilities

- `catalogue.js`: one source of truth for package/test IDs, names, prices, cumulative inclusions,
  optional components, duplicate prevention, totals and price comparisons.
- `app.js`: public page rendering, selection, browser plan storage, form validation, appointment
  browsing, final review, demo submission, code copy and PDF/print actions.
- `appointment-rules.js`: shared Malaysia-time rules, tomorrow-to-three-month window, weekdays
  and morning times. Changing these client rules alone does not change the server rules.
- `icons.js`: local decorative SVG pictograms for the tests.
- `pdf.js`: local A4 PDF generation. It uploads nothing. Its existing built-in font has limited
  Unicode support; a future Arabic PDF would need a suitable embedded font.
- `demo-config.js`: public project URL, publishable key and gateway URL. These are not service-role
  credentials. Database access still requires server-side permissions.
- `track.js`: code normalisation, lookup feedback, safe result rendering and change-request replies.
- `admin-data.js`: Supabase Auth, owner-approved role check, authorised queries, audited actions
  and Realtime subscriptions. Sessions are limited to the current browser tab.
- `admin.js`: staff UI, search/filter/sort/pagination, summaries, schedule conflicts and action forms.

The scripts use shared browser objects such as `window.UWC`; their order in each HTML head matters.
`defer` waits until the page has been parsed and preserves execution order.

## Styling

- `styles.css`: public-site base theme, layout, components, breakpoints and print rules.
- `enhancements.css`: public feature styling: About disclosure, pictograms, photographs, forms,
  weekly appointment picker, review and confirmation.
- `readability.css`: loaded last; larger text, touch targets, mobile corrections and uniform
  package price presentation. Later overrides are intentional, not duplicates to merge casually.
- `demo.css`: independent shared theme for tracking, staff and guide pages. Guide-specific rules
  are scoped to `guide-` classes so they do not affect booking/admin forms.

Keep selector/rule order unless you have checked the resulting layout. Animation rules respect
reduced-motion preferences. Native dialogs and visible focus rings support keyboard use.

## Data and security boundaries

- Only selected package/test IDs are saved in local storage. Customer drafts stay in memory until
  the customer confirms sending the request; closing a form does not erase its draft.
- The guest gateway validates requests, limits attempts and calls a fixed allowlist of database
  functions. The server creates booking codes; the browser cannot invent them or mark payments paid.
- `supabase/functions/booking-gateway/index.ts` is server code. Secrets come from environment
  variables and must never be placed in `demo-config.js`, HTML or Git.
- Applied files in `supabase/migrations/` are database history. Leave them unchanged; future schema
  work needs a new migration and deliberate deployment. No SQL was changed by the code cleanup.
- `supabase/config.toml` permits no-login guest gateway calls, not public table access. The gateway
  and SQL permissions still enforce the security boundary.
- The staff interface uses approved Auth users and database RLS. Hiding a button is not security.
  Internal notes are staff-only; only customer-visible notes belong in guest responses.
- `api/prototype-status.php` returns public prototype information only. It does not process bookings,
  receive contact information or take payments. Demo requests use the Supabase gateway instead.
- This remains a no-payment prototype, not a live UWC slot reservation service.

## Comments and safe edits

- HTML comments: `<!-- explanation -->`. They do not display, but anyone can read page source;
  never put passwords or secret keys inside them.
- CSS comments: `/* explanation */`.
- JavaScript/TypeScript: `// explanation` or `/* explanation */`.
- PHP and PowerShell: the existing `//`/`#` comments explain the small server/build helpers.
- JSON does not permit comments. `package.json` defines development commands/dependencies,
  `.prettierrc.json` formatting choices, and `vercel.json` hosting/runtime configuration.
- Preserve HTML IDs and `data-action` values: JavaScript uses them to locate/wire controls.
- Do not edit `vendor/supabase.js` (third-party library) or `dist/` (generated publishing copy).
- Do not trust browser validation alone; database/gateway validation must remain in place.

## Test, build and publish

Run from the Desktop `UWC-Website-Project` folder:

```powershell
npm ci
npm run format
npm run format:check
npm test
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

- Prettier is a development-only formatter, not a new website framework. Its version is pinned.
  `.prettierignore` excludes generated files, third-party assets and historical SQL.
- `.gitattributes` keeps owned text files on the same LF line endings when checked out on Windows.
- `tests/` uses fake Supabase/storage/DOM fixtures; the tests do not modify real appointments.
- `build.ps1` copies owned source and referenced assets into `dist/`, including `/guide/`.
- Preview locally with the README command; check desktop/mobile, package switching, draft retention,
  review, tracker feedback and staff sign-in. Use only test customer details for deliberate demo submissions.
- Push the tested source/build to the existing GitHub `main` branch. Vercel updates the same address:
  <https://uwc-wellness-centre-prototype.vercel.app/>. Do not create another hosting project.

For owner-only staff creation/approval, see `docs/STAFF-DASHBOARD-SETUP.md`.
