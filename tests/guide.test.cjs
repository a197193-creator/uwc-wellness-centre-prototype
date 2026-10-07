// Guide/page structure checks are offline: no live customer records or staff accounts are used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('all four page templates have unique IDs and a keyboard skip link', () => {
  for (const file of ['index.html', 'admin/index.html', 'track/index.html', 'guide/index.html']) {
    const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
    try {
      const doc = dom.window.document;
      const ids = [...doc.querySelectorAll('[id]')].map((node) => node.id);
      assert.equal(new Set(ids).size, ids.length, file + ' has duplicate IDs');
      assert.equal(doc.querySelector('.skip-link').getAttribute('href'), '#main');
      assert.ok(doc.getElementById('main'));
      assert.equal(doc.documentElement.lang, 'en');
    } finally {
      dom.window.close();
    }
  }
});

test('the static guide maps pages to code and contains no database/login scripts', () => {
  const dom = new JSDOM(fs.readFileSync('guide/index.html', 'utf8'));
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.guide-grid > section').length, 4);
    assert.equal(doc.querySelectorAll('script, form, input').length, 0);
    for (const path of ['/', '/track/', '/admin/']) {
      assert.ok(doc.querySelector('a[href="' + path + '"]'));
      assert.ok(fs.existsSync('.' + path + 'index.html'));
    }
    assert.match(doc.body.textContent, /No payment is taken/);
    assert.match(doc.body.textContent, /admin-data\.js/);
    assert.match(doc.body.textContent, /docs\/CODE-GUIDE\.md/);
    const home = new JSDOM(fs.readFileSync('index.html', 'utf8'));
    try {
      assert.ok(home.window.document.querySelector('footer a[href="/guide/"]'));
    } finally {
      home.window.close();
    }
  } finally {
    dom.window.close();
  }
});
