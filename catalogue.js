/* UWC prototype catalogue. Proposed prices are from Package Summary EN (September 2026).
   No payment, booking or clinical suitability decision is made by this model. */
(function (root) {
  'use strict';

  const packages = [
    { id: 'baseline', number: 1, short: 'Baseline', name: 'Precision Baseline Health Screening', price: 450,
      tagline: 'Begin with the essentials.', description: 'A starting point for exploring body composition, heart and lung measurements, and routine laboratory screening.',
      highlights: ['Body composition, ECG & spirometry', 'Basic blood and urine screening', 'HbA1c & urine albumin-creatinine ratio'],
      note: 'Six proposed screening components. Prices and final service scope are subject to confirmation.' },
    { id: 'expanded', number: 2, short: 'Expanded', name: 'Precision Expanded Health Screening', price: 1500,
      tagline: 'See a broader picture.', description: 'Everything in Baseline, with imaging, vitamin D, activity and skin assessments, and an integrated annual health report.',
      highlights: ['All Baseline components included', 'DEXA, vitamin D & retinal screening', 'Activity assessment & annual report'],
      note: 'Includes Baseline. Wearable assessment and annual-report prices are provisional; their duration and scope remain to be confirmed.' },
    { id: 'wellness', number: 3, short: 'Wellness', name: 'Precision Wellness and Health Status', price: 4200,
      tagline: 'Explore in greater detail.', description: 'Everything in Expanded, with additional cardiac, metabolic, renal, cognitive and nutritional assessments.',
      highlights: ['All Expanded components included', 'Additional biomarkers & cognitive screening', '25 trace elements and vitamins A & E'],
      note: 'Includes Expanded. The exact extended-lipid panel and the distinction between the two listed DEXA services need confirmation.' },
    { id: 'longevity', number: 4, short: 'Longevity', name: 'Precision Longevity', price: 7500,
      tagline: 'Explore a personalised pathway.', description: 'Build on Wellness with a proposed targeted genomic pathway, and discuss further genomic, microbiome and monitoring options.',
      highlights: ['All Wellness components included', 'Starting targeted-DNA pathway', 'Further options reviewed individually'],
      note: 'RM7,500 is a proposed starting price for the targeted-panel pathway, not a confirmed quote. WES/WGS upgrades, microbiome, pharmacogenomics, genomic reporting and monitoring scope must be reviewed.' }
  ];

  const tests = [
    { id: 'inbody', name: 'InBody / body composition', price: 60, tier: 1, category: 'Physical measurements', description: 'A body-composition measurement covering body fat and muscle estimates. The final report and consultation scope will be confirmed.' },
    { id: 'ecg', name: 'Electrocardiogram (ECG)', price: 80, tier: 1, category: 'Physical measurements', description: 'A recording of the heart’s electrical activity. Interpretation and service arrangements are subject to clinical review.' },
    { id: 'spirometry', name: 'Spirometry / lung function', price: 100, tier: 1, category: 'Physical measurements', description: 'A breathing assessment that records airflow and the amount of air moved during the test.' },
    { id: 'basic-blood', name: 'Basic blood & urine package', price: 220, tier: 1, category: 'Laboratory screening', description: 'One bundled component covering full blood count, fasting glucose, renal, lipid and liver profiles, plus urine testing. Individual parameters do not have separate prices in the source.' },
    { id: 'hba1c', name: 'HbA1c', price: 50, tier: 1, category: 'Laboratory screening', description: 'A laboratory measurement of glycated haemoglobin. Results are considered together with clinical history and other relevant assessments.' },
    { id: 'uacr', name: 'Urine albumin-creatinine ratio (UACR)', price: 80, tier: 1, category: 'Laboratory screening', description: 'A urine measurement comparing albumin with creatinine, also referred to as ACR.' },
    { id: 'dexa-whole', name: 'DEXA whole-body assessment', price: 300, tier: 2, category: 'Imaging & assessments', description: 'The proposal lists whole-body composition and bone assessment. The extent of bone-density reporting needs confirmation before ordering a separate BMD assessment.' },
    { id: 'vitamin-d', name: 'Vitamin D', price: 140, tier: 2, category: 'Laboratory screening', description: 'A vitamin D laboratory assessment. The final assay, preparation and report details will be confirmed by UWC.' },
    { id: 'retinal', name: 'Retinal / AI fundus screening', price: 80, tier: 2, category: 'Imaging & assessments', description: 'Retinal imaging with a proposed AI-supported screening pathway. Image capture, AI analysis and specialist interpretation are different services; the included scope is to be confirmed.' },
    { id: 'sens', name: 'SENS wearable activity assessment', price: 250, tier: 2, category: 'Activity & reporting', provisional: true, description: 'A proposed wearable-based activity assessment. Wear duration, reporting and any consultation arrangements are still being defined.' },
    { id: 'skin-age', name: 'Skin-age / AI skin analysis', price: 150, tier: 2, category: 'Imaging & assessments', description: 'A proposed image-based skin assessment. The technology used and any consultation or reporting included will be confirmed.' },
    { id: 'annual-report', name: 'Integrated annual health report', price: 150, tier: 2, category: 'Activity & reporting', provisional: true, description: 'A proposed report bringing the selected screening findings together. The reporting scope and review process remain to be finalised.' },
    { id: 'bnp', name: 'BNP', price: 200, tier: 3, category: 'Additional biomarkers', description: 'A proposed cardiac biomarker assessment. The laboratory must confirm whether the final service uses BNP or NT-proBNP.' },
    { id: 'troponin', name: 'Troponin T / I', price: 80, tier: 3, category: 'Additional biomarkers', description: 'A proposed cardiac biomarker test. The assay and clinical interpretation arrangements require confirmation.' },
    { id: 'extended-lipid', name: 'Extended lipid assessment', price: 100, tier: 3, category: 'Additional biomarkers', provisional: true, description: 'Additional lipid-related measurements beyond the basic profile. The exact panel has not yet been defined, so this is a working price.' },
    { id: 'cystatin-c', name: 'Cystatin C', price: 120, tier: 3, category: 'Additional biomarkers', description: 'An additional laboratory marker included in the proposed renal assessment. Final reporting and interpretation details will be confirmed.' },
    { id: 'homa', name: 'Fasting insulin + HOMA-IR', price: 120, tier: 3, category: 'Additional biomarkers', description: 'Fasting insulin testing with HOMA-IR calculated using fasting glucose and insulin. Any additional glucose charge for a standalone order must be confirmed.' },
    { id: 'dexa-bmd', name: 'DEXA bone-density (BMD)', price: 200, tier: 3, category: 'Imaging & assessments', description: 'A proposed bone-density assessment. It may overlap the bone assessment listed within Expanded; UWC must confirm whether a separate service is required.' },
    { id: 'moca', name: 'MoCA cognitive screening', price: 180, tier: 3, category: 'Imaging & assessments', description: 'A structured cognitive screening assessment administered and interpreted by a trained professional.' },
    { id: 'trace-elements', name: '25 trace elements', price: 675, tier: 3, category: 'Nutritional screening', description: 'The proposed UMBI panel of 25 trace elements. The catalogue price uses the UWC 2026 market-survey proposal; final panel and collection details require confirmation.' },
    { id: 'vitamins-ae', name: 'Vitamins A & E (combined)', price: 833, tier: 3, category: 'Nutritional screening', description: 'A combined vitamin A and vitamin E laboratory component, using the proposed UMBI combined-panel price.' },
    { id: 'targeted-dna', name: 'Targeted wellness / DNA panel', price: 1500, tier: 4, category: 'Genomic pathway', genomic: true, description: 'The entry genomic option used for the proposed Longevity starting price. The final genes, analysis and interpretation scope remain to be defined.' },
    { id: 'wes', name: 'Whole Exome Sequencing (WES)', price: 3000, tier: 4, category: 'Genomic pathway', genomic: true, optional: true, provisional: true, description: 'An alternative genomic pathway. Coverage, analysis and reporting are to be confirmed. RM3,000 is a standalone working reference, not a confirmed Longevity upgrade charge.' },
    { id: 'wgs', name: 'Whole Genome Sequencing (WGS)', price: 6999, tier: 4, category: 'Genomic pathway', genomic: true, optional: true, description: 'An alternative genomic pathway with a standalone reference price of RM6,999. The final service scope and Longevity upgrade price require a quotation.' },
    { id: 'microbiome', name: 'Gut microbiome sequencing', price: 2288, tier: 4, category: 'Options to discuss', optional: true, description: 'A proposed microbiome option. Sequencing method, report scope and whether it is included in the Longevity starting price remain unconfirmed.' },
    { id: 'pgx', name: 'Pharmacogenomics', price: 2500, tier: 4, category: 'Options to discuss', optional: true, description: 'An optional genomic assessment relating to medication response. The gene panel, medicines covered and professional interpretation scope require confirmation.' },
    { id: 'genomic-report', name: 'Genomic interpretation report', price: 800, tier: 4, category: 'Options to discuss', optional: true, provisional: true, description: 'A proposed genomic interpretation service. The reporting scope and whether this is included in the Longevity starting price must be confirmed.' },
    { id: 'monitoring', name: 'Long-term monitoring plan', price: 500, tier: 4, category: 'Options to discuss', optional: true, provisional: true, description: 'A proposed repeat-monitoring service. Duration, review frequency, professional input and inclusion in the Longevity starting price remain unconfirmed.' }
  ].map(function (test) {
    return Object.freeze(Object.assign({ provisional: false, optional: false, genomic: false }, test));
  });
  packages.forEach(function (pkg) { Object.freeze(pkg.highlights); Object.freeze(pkg); });
  Object.freeze(packages);
  Object.freeze(tests);

  const packageMap = new Map(packages.map(function (pkg) { return [pkg.id, pkg]; }));
  const testMap = new Map(tests.map(function (test) { return [test.id, test]; }));

  function requirePackage(id) {
    if (!packageMap.has(id)) throw new Error('Unknown screening package: ' + id);
    return packageMap.get(id);
  }

  function getTests(packageId) {
    const pkg = requirePackage(packageId);
    return tests.filter(function (test) { return test.tier <= pkg.number; });
  }

  function coveredIds(packageId) {
    return getTests(packageId).filter(function (test) { return !test.optional; }).map(function (test) { return test.id; });
  }

  function createPlan() { return []; }

  // Restored client-side data is treated as untrusted: discard unknown entries and duplicates.
  function cleanPlan(plan) {
    if (!Array.isArray(plan)) return [];
    const seen = new Set();
    let packageFound = false;
    return plan.filter(function (entry) {
      if (!entry || (entry.kind !== 'package' && entry.kind !== 'test')) return false;
      const key = entry.kind + ':' + entry.id;
      if (seen.has(key)) return false;
      if (entry.kind === 'package') {
        if (!packageMap.has(entry.id) || packageFound) return false;
        packageFound = true;
      } else if (!testMap.has(entry.id)) return false;
      seen.add(key);
      return true;
    }).map(function (entry) { return { kind: entry.kind, id: entry.id }; });
  }

  function addPackage(plan, id) {
    requirePackage(id);
    const current = cleanPlan(plan);
    if (current.some(function (entry) { return entry.kind === 'package' && entry.id === id; })) return current;
    const covered = new Set(coveredIds(id));
    const remaining = current.filter(function (entry) {
      return entry.kind === 'test' && !covered.has(entry.id) && !(covered.has('targeted-dna') && testMap.get(entry.id).genomic);
    });
    return [{ kind: 'package', id: id }].concat(remaining);
  }

  function addTest(plan, id) {
    if (!testMap.has(id)) throw new Error('Unknown screening component: ' + id);
    const current = cleanPlan(plan);
    const pkg = current.find(function (entry) { return entry.kind === 'package'; });
    if (pkg && coveredIds(pkg.id).includes(id)) return current;
    if (current.some(function (entry) { return entry.kind === 'test' && entry.id === id; })) return current;
    const test = testMap.get(id);
    const remaining = test.genomic ? current.filter(function (entry) {
      return entry.kind !== 'test' || !testMap.get(entry.id).genomic;
    }) : current;
    return remaining.concat({ kind: 'test', id: id });
  }

  function removeItem(plan, key) {
    return cleanPlan(plan).filter(function (entry) { return entry.kind + ':' + entry.id !== key; });
  }

  function summarize(plan) {
    const clean = cleanPlan(plan);
    const pkgEntry = clean.find(function (entry) { return entry.kind === 'package'; });
    const pkg = pkgEntry ? packageMap.get(pkgEntry.id) : null;
    const covered = new Set(pkg ? coveredIds(pkg.id) : []);
    const unique = clean.filter(function (entry) { return entry.kind === 'package' || !covered.has(entry.id); });
    const hasWholeBody = covered.has('dexa-whole') || unique.some(function (entry) { return entry.kind === 'test' && entry.id === 'dexa-whole'; });
    const warnings = [];
    if (pkg && pkg.id === 'longevity') warnings.push('Longevity starts from RM7,500 on the targeted-panel pathway. Final inclusions and any option or upgrade charges require confirmation.');
    if (pkg && pkg.number >= 3) warnings.push('The source lists both whole-body DEXA and BMD. UWC must confirm the scope and avoid duplicate assessment charges.');

    const items = unique.map(function (entry) {
      const source = entry.kind === 'package' ? packageMap.get(entry.id) : testMap.get(entry.id);
      const item = { key: entry.kind + ':' + entry.id, kind: entry.kind, id: entry.id, name: source.name, price: source.price, referencePrice: null, note: '' };
      if (entry.kind === 'package') {
        item.note = source.id === 'longevity' ? 'Proposed starting price; final quote required.' : 'Proposed package price.';
      } else if (pkg && pkg.id === 'longevity' && source.optional) {
        item.price = null;
        item.referencePrice = source.price;
        item.note = source.genomic ? 'Alternative to the targeted-panel pathway. Upgrade charge to be quoted; reference is the standalone price.' : 'Inclusion and any additional charge to be confirmed; reference is the standalone price.';
      } else if (entry.id === 'dexa-bmd' && hasWholeBody) {
        item.price = null;
        item.referencePrice = source.price;
        item.note = 'Possible overlap with whole-body DEXA. No extra BMD charge has been added pending scope review.';
        warnings.push('Separate DEXA BMD may duplicate the selected whole-body assessment; its RM200 reference is excluded from the subtotal pending review.');
      } else {
        item.note = source.provisional ? 'Working prototype price; confirmation required.' : 'Proposed standalone price.';
        if (source.tier === 4) item.note += ' Final panel or service scope requires confirmation.';
      }
      if (entry.kind === 'test' && entry.id === 'homa' && !covered.has('basic-blood') && !unique.some(function (test) { return test.kind === 'test' && test.id === 'basic-blood'; })) {
        warnings.push('HOMA-IR also needs a fasting-glucose result. Confirm whether any additional glucose test or charge is required for this standalone selection.');
      }
      return item;
    });

    if (items.some(function (item) { return item.kind === 'test' && testMap.get(item.id).provisional; })) warnings.push('Some selected items have working prototype prices that require UMBI costing or quotation.');
    const needsQuote = Boolean(pkg && pkg.id === 'longevity') || items.some(function (item) { return item.price === null || (item.kind === 'test' && (testMap.get(item.id).provisional || testMap.get(item.id).tier === 4)); }) || warnings.length > 0;
    return { items: items, count: items.length, subtotal: items.reduce(function (total, item) { return total + (item.price === null ? 0 : item.price); }, 0), needsQuote: needsQuote, warnings: Array.from(new Set(warnings)) };
  }

  const api = Object.freeze({ packages: packages, tests: tests, getTests: getTests, coveredIds: coveredIds, createPlan: createPlan, addPackage: addPackage, addTest: addTest, removeItem: removeItem, summarize: summarize });
  if (root) root.UWC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : null));
