const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function harness() {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    url: 'https://test.invalid/', runScripts: 'outside-only'
  });
  const w = dom.window, doc = w.document;
  w.fetch = async () => ({ ok: false });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false; this.dispatchEvent(new w.Event('close'));
  };
  for (const file of ['catalogue.js', 'icons.js', 'appointment-rules.js', 'app.js']) {
    w.eval(fs.readFileSync(file, 'utf8'));
  }
  const click = selector => doc.querySelector(selector).click();
  return { w, doc, click, close: () => w.close() };
}

test('all four price summaries have identical markup except the amount/range', () => {
  const h = harness();
  try {
    const shapes = [];
    for (const pkg of h.w.UWC.packages) {
      h.click('#tab-' + pkg.id);
      const summary = h.doc.querySelector('.package-price-summary');
      assert.equal(summary.querySelector('.package-price').textContent, 'RM' + pkg.price.toLocaleString('en-MY'));
      assert.equal(summary.querySelector('.price-range strong').textContent, pkg.priceRange);
      assert.equal(summary.querySelector('.price-caption-label').textContent, 'Proposed package price');
      assert.equal(summary.querySelector('.package-price small'), null);
      assert.doesNotMatch(summary.textContent, /\bFrom\b/);
      shapes.push(summary.outerHTML.replace(/RM[\d,]+(?:–RM[\d,]+)?\+?/g, 'AMOUNT'));
    }
    assert.equal(new Set(shapes).size, 1);
  } finally { h.close(); }
});

test('package tab and comparison prices have no prefix and retain supplied amounts', () => {
  const h = harness();
  try {
    for (const pkg of h.w.UWC.packages) {
      h.click('#tab-' + pkg.id);
      const tabPrice = h.doc.querySelector('#tab-' + pkg.id + ' .tab-price');
      assert.doesNotMatch(tabPrice.textContent, /\bFrom\b/);
      assert.equal(tabPrice.querySelector('small'), null);
      const values = [...h.doc.querySelectorAll('.package-comparison-summary strong')].map(e => e.textContent);
      assert.deepEqual(values, [pkg.aLaCarteTotal, pkg.price].map(n => 'RM' + n.toLocaleString('en-MY'))
        .concat((pkg.saving < 0 ? '-' : '') + 'RM' + Math.abs(pkg.saving).toLocaleString('en-MY')));
    }
  } finally { h.close(); }
});

test('keyboard package switching keeps focus, labels and the Longevity qualification', () => {
  const h = harness();
  try {
    const key = value => h.doc.querySelector('#package-tabs').dispatchEvent(new h.w.KeyboardEvent('keydown', { key: value, bubbles: true }));
    key('End');
    assert.equal(h.doc.activeElement.id, 'tab-longevity');
    assert.equal(h.doc.querySelector('#package-panel').getAttribute('aria-labelledby'), 'tab-longevity');
    assert.match(h.doc.querySelector('.sidebar-note').textContent, /Starting price only/);
    assert.match(h.doc.querySelector('.package-rationale').textContent, /upgrades or add-ons/);
    key('ArrowRight');
    assert.equal(h.doc.activeElement.id, 'tab-baseline');
    assert.equal(h.doc.querySelectorAll('[role="tab"][tabindex="0"]').length, 1);
  } finally { h.close(); }
});

test('selecting/removing a package preserves totals and uniform summary markup', () => {
  const h = harness();
  try {
    h.click('#tab-longevity'); h.click('[data-add-package="longevity"]');
    assert.equal(h.doc.querySelector('#plan-total').textContent, 'RM7,500');
    assert.match(h.doc.querySelector('.package-selected-status').textContent, /Added to your plan/);
    assert.match(h.doc.querySelector('#plan-warnings').textContent, /starting price/);
    assert.doesNotMatch(h.doc.querySelector('.package-price').textContent, /From/);
    h.click('[data-action="open-plan"]'); h.click('[data-remove="package:longevity"]');
    assert.equal(h.doc.querySelector('#plan-total').textContent, 'RM0');
    assert.equal(h.doc.querySelector('[data-action="open-details"]').disabled, true);
    assert.ok(h.doc.querySelector('[data-add-package="longevity"]'));
  } finally { h.close(); }
});

test('a full custom Longevity match uses the same numeric-only package price', () => {
  const h = harness();
  try {
    h.click('#tab-longevity');
    for (const item of h.w.UWC.getTests('longevity')) h.click('#package-panel [data-test="' + item.id + '"]');
    const offer = h.doc.querySelector('.package-match-complete');
    assert.ok(offer);
    assert.equal(offer.querySelectorAll('.comparison-prices strong')[1].textContent, 'RM7,500');
    assert.doesNotMatch(offer.querySelector('.comparison-prices').textContent, /From/);
    assert.ok(offer.querySelector('[data-switch-package="longevity"]'));
  } finally { h.close(); }
});

test('sticky section offset follows header resizing instead of fixed package-dependent spacing', () => {
  const h = harness();
  try {
    h.doc.querySelector('.site-header').getBoundingClientRect = () => ({ height: 176 });
    h.w.dispatchEvent(new h.w.Event('resize'));
    assert.equal(h.doc.documentElement.style.getPropertyValue('--site-header-offset'), '194px');
  } finally { h.close(); }
});
