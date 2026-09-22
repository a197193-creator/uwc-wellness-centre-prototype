(function (root) {
  'use strict';

  const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

  // Simple, local line icons inspired by the screening pictograms in the UWC proposal.
  // They are decorative: the adjacent test name remains the accessible label.
  const motifs = Object.freeze({
    wellness: '<path d="M12 20s-8-4.7-8-10a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 10c0 5.3-8 10-8 10Z"/><path d="M7 12h3l1-3 2 6 1-3h3"/>',
    body: '<circle cx="12" cy="5" r="2.2"/><path d="M8.2 20v-4.7c0-2.2 1.7-4 3.8-4s3.8 1.8 3.8 4V20M5 9V5h3M19 9V5h-3M5 15v4h3M19 15v4h-3"/>',
    ecg: '<path d="M12 20s-8-4.7-8-10a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 10c0 5.3-8 10-8 10Z"/><path d="M6.5 12H9l1.3-3.2 2.2 6.4 1.5-3.2h3.5"/>',
    lungs: '<path d="M12 4v8M10 7.5 8.5 9"/><path d="M9.5 7.5c-1.1.5-2.1 1.4-2.8 2.6l-2 3.5c-1.6 2.9-.1 5.7 2.6 5.7 2.1 0 3.7-1.7 3.7-3.8V9.4M14.5 7.5c1.1.5 2.1 1.4 2.8 2.6l2 3.5c1.6 2.9.1 5.7-2.6 5.7-2.1 0-3.7-1.7-3.7-3.8V9.4"/>',
    lab: '<path d="M5 3h6M6.5 3v6.3L4.4 17a2.7 2.7 0 0 0 2.6 3.4h3.6a2.7 2.7 0 0 0 2.6-3.4l-2.1-7.7V3M15 5h4M16 5v5.8l-1.5 5.5a2.1 2.1 0 0 0 2 2.7h1.9a2.1 2.1 0 0 0 2-2.7L19 10.8V5M5.7 14h6.2M15.4 14h4.1"/>',
    'blood-sugar': '<path d="M12 3.2s-5 6-5 10.3a5 5 0 0 0 10 0C17 9.2 12 3.2 12 3.2Z"/><path d="M9.5 14.2h5M12 11.7v5"/>',
    kidneys: '<path d="M9.7 5.2C7.8 3.9 4.8 5.3 4.3 8.7c-.5 3.6 1.1 7.6 4.1 7.4 2.3-.2 2.7-2.6 2.1-4.6-.5-1.8-2.2-2.2-2.8-1.1M14.3 5.2c1.9-1.3 4.9.1 5.4 3.5.5 3.6-1.1 7.6-4.1 7.4-2.3-.2-2.7-2.6-2.1-4.6.5-1.8 2.2-2.2 2.8-1.1M12 11.5v7.3"/><path d="M12 18.8c0 1.2-1 2.2-2.2 2.2"/>',
    'bone-scan': '<path d="M7 3H4a1 1 0 0 0-1 1v3M17 3h3a1 1 0 0 1 1 1v3M7 21H4a1 1 0 0 1-1-1v-3M17 21h3a1 1 0 0 0 1-1v-3"/><path d="M8.2 15.8a2 2 0 1 1-2.8-2.8l5.6-5.6a2 2 0 1 1 2.8 2.8l-5.6 5.6Z"/><path d="m11.8 8.2 4 4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    eye: '<path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/><path d="m18.5 5.5 1-1M5.5 5.5l-1-1"/>',
    activity: '<circle cx="14.8" cy="4.8" r="2"/><path d="m12.8 8.2-2.4 3.3 3.2 2 1.4 3.2M10.4 11.5l-3.7-1.2M13.6 13.5l-3.3 5.3M15.1 9.2l3.2 2M4 20h4"/>',
    'face-scan': '<path d="M7 3H4a1 1 0 0 0-1 1v3M17 3h3a1 1 0 0 1 1 1v3M7 21H4a1 1 0 0 1-1-1v-3M17 21h3a1 1 0 0 0 1-1v-3"/><circle cx="12" cy="10" r="3"/><path d="M7.5 18c.8-2.1 2.3-3.2 4.5-3.2s3.7 1.1 4.5 3.2M18.5 9.5v3M17 11h3"/>',
    report: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v5h4M10 12h5M10 16h5M10 8h1"/>',
    'heart-drop': '<path d="M11.5 19.2S4 14.9 4 9.8a4 4 0 0 1 7.5-2A4 4 0 0 1 19 9.8c0 1.7-.8 3.3-2 4.7"/><path d="M18 14s-2.5 2.9-2.5 5a2.5 2.5 0 0 0 5 0c0-2.1-2.5-5-2.5-5Z"/>',
    'heart-lab': '<path d="M11 18.8S4 14.7 4 9.8a4 4 0 0 1 7.5-2A4 4 0 0 1 19 9.8c0 1.1-.4 2.3-1.1 3.3"/><path d="M15 14h6M16.5 14v4.5a2.2 2.2 0 0 0 4.3.6l-1.3-4.6V14M16.2 17.5h4"/>',
    lipids: '<path d="M10.5 3.5s-4.7 5.6-4.7 9.5a4.7 4.7 0 0 0 9.4 0c0-3.9-4.7-9.5-4.7-9.5Z"/><circle cx="18.2" cy="7" r="2"/><circle cx="18.5" cy="16.5" r="2.5"/><path d="m15.2 11.3 1.6-2.5M15 14.5l1.2.7"/>',
    insulin: '<path d="m5 17 9.7-9.7M12.8 5.2l6 6M15 3l6 6M5.8 14.2l4 4M4.2 17.8 2.5 21l3.2-1.7M17.8 10.2l2.2-2.2"/><path d="M6.5 11.5 9 14"/>',
    bone: '<path d="M8.2 15.8a2 2 0 1 1-2.8-2.8l5.6-5.6a2 2 0 1 1 2.8 2.8l-5.6 5.6Z"/><path d="m11.8 8.2 4 4a2 2 0 1 1 2.8 2.8L13 20.6a2 2 0 1 1-2.8-2.8"/>',
    brain: '<path d="M9.3 5.1A3.2 3.2 0 0 0 4.8 8a3.5 3.5 0 0 0 .5 6.8 3.2 3.2 0 0 0 4 4.1M14.7 5.1A3.2 3.2 0 0 1 19.2 8a3.5 3.5 0 0 1-.5 6.8 3.2 3.2 0 0 1-4 4.1M12 4v16M8 8.5c0 1.4.8 2.3 2.2 2.5M16 8.5c0 1.4-.8 2.3-2.2 2.5M8.2 15.5c.2-1.3.9-2.1 2-2.4M15.8 15.5c-.2-1.3-.9-2.1-2-2.4"/>',
    atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)"/>',
    vitamins: '<path d="M5.4 18.6a4 4 0 0 1 0-5.7l7.5-7.5a4 4 0 0 1 5.7 5.7l-7.5 7.5a4 4 0 0 1-5.7 0Z"/><path d="m9.2 9.2 5.6 5.6M5 5v3M3.5 6.5h3M19 17v4M17 19h4"/>',
    'dna-target': '<path d="M8 3c0 5 8 5 8 10s-4 8-4 8M16 3c0 5-8 5-8 10s4 8 4 8M9.5 6h5M8.5 10h7M8.5 14h7M9.5 18h5"/><circle cx="18.5" cy="5.5" r="3"/><path d="M18.5 3.8v3.4M16.8 5.5h3.4"/>',
    'dna-search': '<path d="M7 3c0 4.5 7 4.5 7 9s-3.5 7-3.5 7M14 3c0 4.5-7 4.5-7 9s3.5 7 3.5 7M8.5 6h4M7.5 10h6M8 15h5"/><circle cx="17.5" cy="16.5" r="3.5"/><path d="m20 19 2 2"/>',
    dna: '<path d="M7 3c0 5 10 5 10 10s-5 8-5 8M17 3c0 5-10 5-10 10s5 8 5 8M9.2 5.7h5.6M7.8 9.5h8.4M7.4 13.5h9.2M8.8 17.5h6.4"/>',
    gut: '<path d="M8 5.5v3.2c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V5.5M6 6.5v8.7A3.8 3.8 0 0 0 9.8 19h4.4a3.8 3.8 0 0 0 3.8-3.8V9.5M9.5 14h5M10 17h4"/><circle cx="4" cy="5" r="1"/><circle cx="19.5" cy="5" r="1"/><circle cx="20.5" cy="13" r="1"/>',
    'dna-pill': '<path d="M4.9 18.6a4 4 0 0 1 0-5.7l7.8-7.8a4 4 0 0 1 5.7 5.7l-7.8 7.8a4 4 0 0 1-5.7 0Z"/><path d="m9 9 6 6M12.5 5.5c0 2 3 2 3 4M7.2 12.2c0 2 3 2 3 4"/>',
    'dna-report': '<path d="M5 3h9l4 4v14H5Z"/><path d="M14 3v5h4M8.5 11c0 2.8 5 2.8 5 5.6M13.5 11c0 2.8-5 2.8-5 5.6M9.5 13h3M9.3 16h3.4"/>',
    monitoring: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M6 16h3l1.2-2.4 2.2 4.8 1.6-2.4h4"/>'
  });

  const tests = Object.freeze({
    inbody: ['body', 'teal'],
    'full-blood-count': ['lab', 'lab'],
    'renal-function': ['kidneys', 'renal'],
    'lipid-profile': ['lipids', 'lab'],
    'fasting-glucose': ['blood-sugar', 'lab'],
    'urine-analysis': ['lab', 'lab'],
    'blood-pressure-bmi': ['heart-drop', 'cardiac'],
    anthropometric: ['body', 'teal'],
    'vascular-screening': ['monitoring', 'cardiac'],
    'urine-albumin': ['kidneys', 'renal'],
    'blood-grouping': ['lab', 'lab'],
    'uric-acid': ['lab', 'lab'],
    'thyroid-function': ['lab', 'lab'],
    'liver-function': ['lab', 'lab'],
    ifobt: ['lab', 'lab'],
    ecg: ['ecg', 'cardiac'],
    spirometry: ['lungs', 'respiratory'],
    'basic-blood': ['lab', 'lab'],
    hba1c: ['blood-sugar', 'lab'],
    uacr: ['kidneys', 'renal'],
    'dexa-whole': ['bone-scan', 'imaging'],
    'vitamin-d': ['sun', 'nutrition'],
    retinal: ['eye', 'imaging'],
    sens: ['activity', 'activity'],
    'skin-age': ['face-scan', 'imaging'],
    'annual-report': ['report', 'reporting'],
    bnp: ['heart-drop', 'cardiac'],
    troponin: ['heart-lab', 'cardiac'],
    'extended-lipid': ['lipids', 'lab'],
    'cystatin-c': ['kidneys', 'renal'],
    homa: ['insulin', 'lab'],
    'dexa-bmd': ['bone', 'imaging'],
    moca: ['brain', 'cognition'],
    'trace-elements': ['atom', 'nutrition'],
    'vitamins-ae': ['vitamins', 'nutrition'],
    'targeted-dna': ['dna-target', 'genomic'],
    wes: ['dna-search', 'genomic'],
    wgs: ['dna', 'genomic'],
    microbiome: ['gut', 'microbiome'],
    pgx: ['dna-pill', 'genomic'],
    'genomic-report': ['dna-report', 'reporting'],
    monitoring: ['monitoring', 'activity']
  });

  function render(testId) {
    const config = tests[testId] || ['wellness', 'teal'];
    const motif = motifs[config[0]] || motifs.wellness;
    return `<span class="test-row-icon test-icon--${config[1]}" data-test-icon="${config[0]}" aria-hidden="true">${svg(motif)}</span>`;
  }

  root.UWCIcons = Object.freeze({
    has: testId => Object.prototype.hasOwnProperty.call(tests, testId),
    render: render
  });
}(typeof window !== 'undefined' ? window : globalThis));
