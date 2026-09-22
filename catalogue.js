/* UWC prototype catalogue confirmed on 22 September 2026.
   Standalone prices for standard-package components remain unconfirmed. */
(function (root) {
  'use strict';

  const packages = [
    {
      id: 'standard',
      number: 1,
      short: 'Standard',
      name: 'Standard Health-Screening Package',
      price: 150,
      tagline: 'A practical starting point.',
      description: 'A combined health-screening package covering routine laboratory investigations and key physical, cardiovascular and respiratory assessments.',
      highlights: ['11 listed screening components', 'Laboratory and physical assessments', 'Cardiovascular and respiratory screening'],
      note: 'Packages, services and prices are subject to confirmation or revision by UWC.'
    }
  ];

  const tests = [
    { id: 'full-blood-count', name: 'Full Blood Count', includedInStandard: true, category: 'Laboratory screening', description: 'A routine full blood count investigation included in the Standard Health-Screening Package.' },
    { id: 'renal-function', name: 'Renal Function', includedInStandard: true, category: 'Laboratory screening', description: 'A kidney-function laboratory assessment included in the Standard Health-Screening Package.' },
    { id: 'lipid-profile', name: 'Lipid Profile', includedInStandard: true, category: 'Laboratory screening', description: 'A blood-lipid assessment included in the Standard Health-Screening Package.' },
    { id: 'fasting-glucose', name: 'Fasting Blood Glucose', includedInStandard: true, category: 'Laboratory screening', description: 'A fasting blood-glucose measurement included in the Standard Health-Screening Package.' },
    { id: 'urine-analysis', name: 'Urine Analysis', includedInStandard: true, category: 'Laboratory screening', description: 'A routine urine assessment included in the Standard Health-Screening Package.' },
    { id: 'inbody', name: 'Body Composition Analysis', includedInStandard: true, category: 'Physical measurements', description: 'A body-composition assessment included in the Standard Health-Screening Package.' },
    { id: 'blood-pressure-bmi', name: 'Blood Pressure and BMI', includedInStandard: true, category: 'Physical measurements', description: 'Blood-pressure and body-mass-index measurements included in the Standard Health-Screening Package.' },
    { id: 'anthropometric', name: 'Anthropometric Measurement', includedInStandard: true, category: 'Physical measurements', description: 'Body measurements included in the Standard Health-Screening Package.' },
    { id: 'ecg', name: 'Electrocardiogram', includedInStandard: true, category: 'Cardiovascular screening', description: 'A recording of the heart’s electrical activity included in the Standard Health-Screening Package.' },
    { id: 'spirometry', name: 'Spirometry', includedInStandard: true, category: 'Respiratory screening', description: 'A breathing and lung-function assessment included in the Standard Health-Screening Package.' },
    { id: 'vascular-screening', name: 'Vascular Screening', includedInStandard: true, category: 'Cardiovascular screening', description: 'A vascular assessment included in the Standard Health-Screening Package.' },

    { id: 'urine-albumin', name: 'Urine Albumin', price: 20, category: 'Add-on screening', description: 'An optional urine albumin screening available as an add-on.' },
    { id: 'hba1c', name: 'HbA1c / Diabetic Control', price: 30, category: 'Add-on screening', description: 'An optional HbA1c assessment for diabetic control available as an add-on.' },
    { id: 'dexa-bmd', name: 'Bone Density Measurement (DEXA)', price: 120, category: 'Add-on screening', description: 'An optional DEXA bone-density measurement available as an add-on.' },
    { id: 'blood-grouping', name: 'Blood Grouping', price: 15, category: 'Add-on screening', description: 'An optional ABO blood-grouping assessment available as an add-on.' },
    { id: 'uric-acid', name: 'Uric Acid Level', price: 20, category: 'Add-on screening', description: 'An optional uric-acid laboratory assessment available as an add-on.' },
    { id: 'vitamin-d', name: 'Vitamin D', price: 100, category: 'Add-on screening', description: 'An optional vitamin D laboratory assessment available as an add-on.' },
    { id: 'thyroid-function', name: 'Thyroid Function Test', price: 50, category: 'Add-on screening', description: 'An optional thyroid-function laboratory assessment available as an add-on.' },
    { id: 'liver-function', name: 'Liver Function Test', price: 50, category: 'Add-on screening', description: 'An optional liver-function laboratory assessment available as an add-on.' },
    { id: 'ifobt', name: 'Colorectal Cancer Screening (iFOBT)', price: 20, category: 'Add-on screening', description: 'An optional immunochemical faecal occult blood test available as an add-on.' }
  ].map(function (test) {
    return Object.freeze(Object.assign({ price: null, includedInStandard: false }, test));
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
    requirePackage(packageId);
    return tests.filter(function (test) { return test.includedInStandard; });
  }

  function coveredIds(packageId) {
    return getTests(packageId).map(function (test) { return test.id; });
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
    const pkg = requirePackage(packageId || 'standard');
    const clean = cleanPlan(plan);
    const covered = coveredIds(pkg.id);
    const selectedIds = new Set(clean.filter(function (entry) { return entry.kind === 'test'; }).map(function (entry) { return entry.id; }));
    const matched = covered.filter(function (id) { return selectedIds.has(id); });
    const selectedTests = matched.map(function (id) { return testMap.get(id); });
    const pricesComplete = selectedTests.length === covered.length && selectedTests.every(function (test) { return Number.isFinite(test.price); });
    const individualTotal = pricesComplete ? selectedTests.reduce(function (total, test) { return total + test.price; }, 0) : null;

    return {
      packageSelected: clean.some(function (entry) { return entry.kind === 'package' && entry.id === pkg.id; }),
      matchedCount: matched.length,
      componentCount: covered.length,
      fullMatch: matched.length === covered.length,
      packagePrice: pkg.price,
      individualTotal: individualTotal,
      saving: individualTotal === null ? null : individualTotal - pkg.price
    };
  }

  function summarize(plan) {
    const clean = cleanPlan(plan);
    const items = clean.map(function (entry) {
      const source = entry.kind === 'package' ? packageMap.get(entry.id) : testMap.get(entry.id);
      return {
        key: entry.kind + ':' + entry.id,
        kind: entry.kind,
        id: entry.id,
        name: source.name,
        price: source.price,
        referencePrice: null,
        note: entry.kind === 'package'
          ? 'Package price; subject to UWC confirmation or revision.'
          : source.includedInStandard
            ? 'Also included in the RM150 standard package. Standalone price requires UWC confirmation.'
            : 'Add-on screening; subject to UWC confirmation or revision.'
      };
    });
    const needsQuote = items.some(function (item) { return item.price === null; });
    const warnings = [];
    if (needsQuote) warnings.push('Standalone prices for standard-package components have not been confirmed by UWC and are excluded from the subtotal.');
    if (items.length) warnings.push('Packages, services and prices are subject to confirmation or revision by UWC.');

    return {
      items: items,
      count: items.length,
      subtotal: items.reduce(function (total, item) { return total + (Number.isFinite(item.price) ? item.price : 0); }, 0),
      needsQuote: needsQuote,
      warnings: warnings
    };
  }

  const api = Object.freeze({
    packages: packages,
    tests: tests,
    getTests: getTests,
    coveredIds: coveredIds,
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
