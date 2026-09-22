/* UWC precision-package prototype catalogue updated on 22 September 2026.
   Prices are proposed comparison figures and remain subject to UWC validation. */
(function (root) {
  'use strict';

  const packages = [
    {
      id: 'baseline',
      number: 1,
      short: 'Baseline',
      name: 'Precision Baseline Health Screening',
      price: 450,
      priceRange: 'RM350–RM500',
      aLaCarteTotal: 590,
      saving: 140,
      tagline: 'FOUNDATIONAL HEALTH INSIGHT',
      description: 'A baseline combination of body composition, cardiovascular and respiratory checks with core laboratory screening.',
      highlights: ['6 listed components', 'À la carte total RM590', 'RM140 below the listed component total'],
      rationale: 'À la carte prices are positioned around the lower-to-average market benchmark. The listed components total approximately RM590; the RM450 package provides RM140 in bundling value.',
      note: 'Proposed prototype pricing. Final scope, suitability and commercial pricing require UWC confirmation.'
    },
    {
      id: 'expanded',
      number: 2,
      short: 'Expanded',
      name: 'Precision Expanded Health Screening',
      price: 1800,
      priceRange: 'RM1,500–RM2,500',
      aLaCarteTotal: 1660,
      saving: -140,
      tagline: 'A BROADER ANNUAL VIEW',
      description: 'Everything in Package 1, expanded with DEXA, vitamin D, retinal, activity, skin-age and integrated reporting services.',
      highlights: ['Everything in Package 1', '12 cumulative components', 'RM140 above the listed component total'],
      rationale: 'DEXA, retinal and skin-age pricing is positioned around the lower-to-average market. Vitamin D uses a competitive market benchmark. Wearable assessment and reporting are working prices because specific market quotations are still required.',
      note: 'The supplied comparison shows RM1,660 à la carte versus RM1,800 as the package price, producing a negative RM140 saving. This requires UWC review.'
    },
    {
      id: 'wellness-status',
      number: 3,
      short: 'Wellness Status',
      name: 'Precision Wellness and Health Status',
      price: 4200,
      priceRange: 'RM3,500–RM5,500',
      aLaCarteTotal: 4958,
      saving: 758,
      tagline: 'ADVANCED WELLNESS PROFILING',
      description: 'Everything in Packages 1 and 2, plus advanced cardiac, metabolic, renal, cognitive, trace-element and vitamin assessments.',
      highlights: ['Everything in Packages 1–2', '21 cumulative components', 'RM758 below the supplied à la carte total'],
      rationale: 'Trace elements (RM675) and Vitamin A & E (RM833) are retained from the UWC 2026/UMBI Market Survey. Other prices are positioned around the lower-to-average market. The extended lipid price remains provisional until the exact panel is confirmed.',
      note: 'Vitamin D and retinal screening carry forward from Package 2 and should not be charged twice.'
    },
    {
      id: 'longevity',
      number: 4,
      short: 'Longevity',
      name: 'Precision Longevity',
      price: 7500,
      pricePrefix: 'From',
      priceRange: 'RM6,000–RM12,000+',
      aLaCarteTotal: 17796,
      saving: 10296,
      tagline: 'GENOMIC AND LONGEVITY OPTIONS',
      description: 'Everything in Packages 1–3, with targeted genomic, sequencing, microbiome, pharmacogenomics, interpretation and monitoring options.',
      highlights: ['Everything in Packages 1–3', 'Genomic and microbiome pathways', 'RM10,296 difference using the supplied comparison total'],
      rationale: 'RM7,500 is the proposed starting price based on the targeted-panel pathway. WES, WGS and pharmacogenomics should be treated as upgrades or add-ons because they materially change the final price.',
      note: 'Starting price only. The final quotation depends on the selected genomic pathway, laboratory workflow, interpretation and monitoring scope.'
    }
  ];

  const tests = [
    { id: 'inbody', name: 'InBody / Body Composition', price: 60, introducedIn: 1, category: 'Physical assessment', description: 'Body-composition assessment using InBody analysis.' },
    { id: 'ecg', name: 'Electrocardiogram (ECG)', price: 80, introducedIn: 1, category: 'Cardiovascular screening', description: 'A recording of the heart’s electrical activity.' },
    { id: 'spirometry', name: 'Spirometry / Lung Function', price: 100, introducedIn: 1, category: 'Respiratory screening', description: 'A breathing assessment used to measure lung function.' },
    { id: 'basic-blood-package', name: 'Basic Blood Package', price: 220, introducedIn: 1, category: 'Laboratory screening', description: 'Includes full blood count, fasting glucose, renal profile, lipid profile, liver function and urine analysis.' },
    { id: 'hba1c', name: 'HbA1c', price: 50, introducedIn: 1, category: 'Metabolic screening', description: 'A laboratory assessment of longer-term blood-glucose control.' },
    { id: 'uacr', name: 'Urine Albumin-Creatinine Ratio (UACR / ACR)', price: 80, introducedIn: 1, category: 'Renal screening', description: 'A urine assessment used in renal-risk screening.' },

    { id: 'dexa-whole-body', name: 'DEXA Whole-Body Assessment', price: 300, introducedIn: 2, category: 'Body and bone assessment', description: 'Whole-body DEXA for body-composition and bone assessment.' },
    { id: 'vitamin-d', name: 'Vitamin D', price: 140, introducedIn: 2, category: 'Vitamin assessment', description: 'A laboratory assessment of vitamin D status.' },
    { id: 'retinal-ai', name: 'Retinal / AI Fundus Screening', price: 80, introducedIn: 2, category: 'Eye screening', description: 'Retinal imaging with the proposed AI-supported fundus-screening pathway.' },
    { id: 'sens-wearable', name: 'SENS Wearable Activity Assessment', price: 250, introducedIn: 2, provisional: true, category: 'Activity assessment', description: 'A proposed wearable-supported activity assessment; duration and reporting scope require confirmation.' },
    { id: 'skin-age', name: 'Skin-Age / AI Skin Analysis', price: 150, introducedIn: 2, category: 'Skin assessment', description: 'A proposed technology-supported skin-age assessment.' },
    { id: 'integrated-report', name: 'Integrated Annual Health Report', price: 150, introducedIn: 2, provisional: true, category: 'Professional reporting', description: 'An integrated annual report bringing the selected screening findings together.' },

    { id: 'bnp', name: 'BNP', price: 200, introducedIn: 3, category: 'Cardiac biomarkers', description: 'A proposed cardiac biomarker assessment; the exact BNP or NT-proBNP platform requires confirmation.' },
    { id: 'troponin', name: 'Troponin T / I', price: 80, introducedIn: 3, category: 'Cardiac biomarkers', description: 'A proposed cardiac biomarker assessment; assay type requires confirmation.' },
    { id: 'extended-lipid', name: 'Extended Lipid Assessment', price: 100, introducedIn: 3, provisional: true, category: 'Metabolic screening', description: 'An advanced lipid assessment whose final panel must be confirmed.' },
    { id: 'cystatin-c', name: 'Cystatin C', price: 120, introducedIn: 3, category: 'Renal screening', description: 'An advanced renal-function biomarker assessment.' },
    { id: 'fasting-insulin-homa', name: 'Fasting Insulin / HOMA-IR', price: 120, introducedIn: 3, category: 'Metabolic screening', description: 'Fasting insulin testing with a calculated HOMA-IR index.' },
    { id: 'dexa-bmd', name: 'DEXA Bone-Density (BMD)', price: 200, introducedIn: 3, category: 'Body and bone assessment', description: 'A DEXA bone-density assessment; overlapping DEXA scope should be reviewed before final charging.' },
    { id: 'moca', name: 'MoCA Cognition Assessment', price: 180, introducedIn: 3, category: 'Cognitive screening', description: 'A proposed professionally administered cognitive screening assessment.' },
    { id: 'trace-elements-25', name: '25 Trace Elements', price: 675, introducedIn: 3, category: 'Micronutrient assessment', description: 'A 25 trace-element assessment using the UWC 2026/UMBI market-survey figure.' },
    { id: 'vitamin-a-e', name: 'Vitamin A & E (Combined)', price: 833, introducedIn: 3, category: 'Vitamin assessment', description: 'Combined vitamin A and E assessment using the UWC 2026/UMBI market-survey figure.' },

    { id: 'targeted-dna', name: 'Targeted Wellness / DNA Panel', price: 1500, introducedIn: 4, category: 'Genomic assessment', description: 'The proposed entry genomic pathway; the final gene panel and interpretation scope require confirmation.' },
    { id: 'wes', name: 'Whole Exome Sequencing (WES)', price: 3000, introducedIn: 4, provisional: true, category: 'Genomic assessment', description: 'A proposed sequencing upgrade whose coverage, workflow and interpretation require confirmation.' },
    { id: 'wgs', name: 'Whole Genome Sequencing (WGS)', price: 6999, introducedIn: 4, optional: true, category: 'Genomic assessment', description: 'A proposed whole-genome sequencing upgrade that materially changes the final quotation.' },
    { id: 'gut-microbiome', name: 'Gut Microbiome Sequencing', price: 2288, introducedIn: 4, optional: true, category: 'Microbiome assessment', description: 'A proposed microbiome sequencing option; depth, report scope and consultation require confirmation.' },
    { id: 'pharmacogenomics', name: 'Pharmacogenomics', price: 2500, introducedIn: 4, optional: true, category: 'Genomic assessment', description: 'An optional pharmacogenomics upgrade rather than an automatic inclusion in every longevity pathway.' },
    { id: 'genomic-report', name: 'Genomic Interpretation Report', price: 800, introducedIn: 4, provisional: true, category: 'Professional reporting', description: 'A proposed professional interpretation report; price depends on panel complexity and expertise.' },
    { id: 'monitoring-plan', name: 'Long-Term Repeat Monitoring Plan', price: 500, introducedIn: 4, provisional: true, category: 'Monitoring service', description: 'A proposed monitoring service whose duration, review frequency and professional input require confirmation.' }
  ].map(function (test) { return Object.freeze(Object.assign({ provisional: false, optional: false }, test)); });

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
    return tests.filter(function (test) { return test.introducedIn <= pkg.number; });
  }

  function getDirectTests(packageId) {
    const pkg = requirePackage(packageId);
    return tests.filter(function (test) { return test.introducedIn === pkg.number; });
  }

  function coveredIds(packageId) {
    return getTests(packageId).map(function (test) { return test.id; });
  }

  function packageNumbersForTest(testId) {
    const test = testMap.get(testId);
    if (!test) return [];
    return packages.filter(function (pkg) { return pkg.number >= test.introducedIn; }).map(function (pkg) { return pkg.number; });
  }

  function createPlan() { return []; }

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
      } else if (!testMap.has(entry.id)) {
        return false;
      }
      seen.add(key);
      return true;
    }).map(function (entry) { return { kind: entry.kind, id: entry.id }; });
  }

  function addPackage(plan, id) {
    requirePackage(id);
    const covered = new Set(coveredIds(id));
    const remaining = cleanPlan(plan).filter(function (entry) {
      return entry.kind === 'test' && !covered.has(entry.id);
    });
    return [{ kind: 'package', id: id }].concat(remaining);
  }

  function addTest(plan, id) {
    if (!testMap.has(id)) throw new Error('Unknown screening service: ' + id);
    const current = cleanPlan(plan);
    const pkg = current.find(function (entry) { return entry.kind === 'package'; });
    if (pkg && coveredIds(pkg.id).includes(id)) return current;
    if (current.some(function (entry) { return entry.kind === 'test' && entry.id === id; })) return current;
    return current.concat({ kind: 'test', id: id });
  }

  function removeItem(plan, key) {
    return cleanPlan(plan).filter(function (entry) { return entry.kind + ':' + entry.id !== key; });
  }

  function comparePackage(plan, packageId) {
    const pkg = requirePackage(packageId || 'baseline');
    const clean = cleanPlan(plan);
    const covered = coveredIds(pkg.id);
    const selectedIds = new Set(clean.filter(function (entry) { return entry.kind === 'test'; }).map(function (entry) { return entry.id; }));
    const matched = covered.filter(function (id) { return selectedIds.has(id); });
    const fullMatch = matched.length === covered.length;

    return {
      packageSelected: clean.some(function (entry) { return entry.kind === 'package' && entry.id === pkg.id; }),
      packageId: pkg.id,
      packageNumber: pkg.number,
      packageName: pkg.name,
      pricePrefix: pkg.pricePrefix || '',
      matchedCount: matched.length,
      componentCount: covered.length,
      fullMatch: fullMatch,
      packagePrice: pkg.price,
      individualTotal: fullMatch ? pkg.aLaCarteTotal : null,
      saving: fullMatch ? pkg.saving : null
    };
  }

  function summarize(plan) {
    const clean = cleanPlan(plan);
    const items = clean.map(function (entry) {
      const source = entry.kind === 'package' ? packageMap.get(entry.id) : testMap.get(entry.id);
      const packageNumbers = entry.kind === 'test' ? packageNumbersForTest(entry.id) : [];
      return {
        key: entry.kind + ':' + entry.id,
        kind: entry.kind,
        id: entry.id,
        name: source.name,
        price: source.price,
        provisional: Boolean(source.provisional),
        note: entry.kind === 'package'
          ? (source.pricePrefix ? 'Starting package price. ' : 'Proposed package price. ') + 'Listed à la carte comparison: RM' + source.aLaCarteTotal.toLocaleString('en-MY') + '.'
          : 'Listed in Package' + (packageNumbers.length > 1 ? 's ' : ' ') + packageNumbers.join(', ') + (source.provisional ? '. Working price pending quotation.' : '.')
      };
    });
    const hasProvisional = items.some(function (item) {
      if (item.provisional) return true;
      if (item.kind !== 'package') return false;
      return getTests(item.id).some(function (test) { return test.provisional; });
    });
    const warnings = [];
    if (hasProvisional) warnings.push('This selection contains working prices that still require UWC costing or a supplier quotation.');
    if (items.some(function (item) { return item.kind === 'package' && item.id === 'expanded'; })) warnings.push('Package 2 is RM140 above its supplied à la carte comparison total and should be reviewed before commercial use.');
    if (items.some(function (item) { return item.kind === 'package' && item.id === 'longevity'; })) warnings.push('The RM7,500 longevity price is a starting price; genomic and microbiome upgrades can materially change the final quotation.');
    if (items.length) warnings.push('Packages, services and prices are proposed prototype figures and remain subject to UWC confirmation.');

    return {
      items: items,
      count: items.length,
      subtotal: items.reduce(function (total, item) { return total + item.price; }, 0),
      needsQuote: hasProvisional,
      warnings: warnings
    };
  }

  const api = Object.freeze({
    packages: packages,
    tests: tests,
    getTests: getTests,
    getDirectTests: getDirectTests,
    coveredIds: coveredIds,
    packageNumbersForTest: packageNumbersForTest,
    createPlan: createPlan,
    addPackage: addPackage,
    addTest: addTest,
    removeItem: removeItem,
    comparePackage: comparePackage,
    summarize: summarize
  });

  if (root) root.UWC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : null));
