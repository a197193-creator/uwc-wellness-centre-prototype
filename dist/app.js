(function () {
  'use strict';
  const model = window.UWC;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => 'RM' + value.toLocaleString('en-MY', {maximumFractionDigits: 0});
  const priceLabel = value => Number.isFinite(value) ? money(value) : 'Price to confirm';
  const testPriceLabel = test => `${priceLabel(test.price)}${test.provisional ? '*' : ''}${test.optional ? ' · optional' : ''}`;
  const storageKey = 'uwc-screening-plan-v4';
  let activePackage = 'baseline';
  let activeSlide = 0;
  let showingAll = false;
  let plan = model.createPlan();
  let detailId = null;
  let confirmation = null;
  let toastTimer;
  let storageAvailable = true;
  const dialogOpeners = new Map();
  const openGroups = new Map();
  const tabNames = {
    baseline:'Precision Baseline<br>Health Screening',
    expanded:'Precision Expanded<br>Health Screening',
    'wellness-status':'Precision Wellness<br>and Health Status',
    longevity:'Precision<br>Longevity'
  };
  const icons = window.UWCIcons;
  const fallbackIcon = '<span class="test-row-icon test-icon--teal" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20s-8-4.7-8-10a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 10c0 5.3-8 10-8 10Z"/><path d="M7 12h3l1-3 2 6 1-3h3"/></svg></span>';

  async function loadPrototypeStatus() {
    const statusText = $('#prototype-status span');
    if (!statusText) return;
    try {
      const response = await fetch('/api/prototype-status.php', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const status = await response.json();
      if (status && status.mode === 'prototype' && status.acceptsBookings === false) {
        statusText.textContent = 'Prototype · No live bookings or payments';
      }
    } catch (_) {
      // Static and local previews keep the useful HTML fallback above.
    }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const valid = model.summarize(saved).items;
    const savedPackage = valid.find(item => item.kind === 'package');
    if (savedPackage) plan = model.addPackage(plan, savedPackage.id);
    valid.filter(item => item.kind === 'test').forEach(item => { plan = model.addTest(plan, item.id); });
  } catch (_) { storageAvailable = false; }

  function getStatus(id) {
    if (plan.some(item => item.kind === 'test' && item.id === id)) return 'selected';
    const pkg = plan.find(item => item.kind === 'package');
    if (pkg && model.coveredIds(pkg.id).includes(id)) return 'covered';
    return 'available';
  }
  function actionButton(test, extraClass = '') {
    const status = getStatus(test.id);
    const label = status === 'covered' ? 'Included' : status === 'selected' ? 'Added ✓' : '+ Add';
    return `<button class="add-test ${status === 'selected' ? 'selected' : ''} ${extraClass}" data-test="${test.id}" ${status === 'covered' ? 'disabled' : ''} aria-label="${status === 'covered' ? 'Included in package: ' : status === 'selected' ? 'Remove from plan: ' : 'Add to plan: '}${escapeHTML(test.name)}">${label}</button>`;
  }
  function testIcon(test) {
    return icons && icons.has(test.id) ? icons.render(test.id) : fallbackIcon;
  }
  function renderTabs() {
    $('#package-tabs').innerHTML = model.packages.map(pkg => `<button class="package-tab" role="tab" id="tab-${pkg.id}" aria-controls="package-panel" aria-selected="${pkg.id === activePackage}" tabindex="${pkg.id === activePackage ? 0 : -1}" data-package-tab="${pkg.id}"><span class="tab-top"><span class="tab-number">PACKAGE 0${pkg.number}</span><span class="tab-arrow" aria-hidden="true">↗</span></span><span class="tab-name">${tabNames[pkg.id]}</span><span class="tab-price">${pkg.pricePrefix ? `<small>${escapeHTML(pkg.pricePrefix)}</small> ` : ''}<strong>${money(pkg.price)}</strong> <span>/ package</span></span></button>`).join('');
  }
  function saveGroupState() {
    $$('.test-group').forEach(group => openGroups.set(group.dataset.group, group.open));
  }
  function testRow(test) {
    return `<div class="test-row">${testIcon(test)}<div class="test-row-content"><button class="test-name" data-detail="${test.id}">${escapeHTML(test.name)}</button><small>${escapeHTML(test.category)}${test.provisional ? ' · working price' : ''}${test.optional ? ' · optional pathway' : ''}</small></div><span class="test-row-price">${testPriceLabel(test)}</span>${actionButton(test)}</div>`;
  }
  function renderPackage() {
    const pkg = model.packages.find(p => p.id === activePackage);
    const coveredCount = model.coveredIds(pkg.id).length;
    const directTests = model.getDirectTests(pkg.id);
    const inheritedTests = model.getTests(pkg.id).filter(test => test.introducedIn < pkg.number);
    const groups = [];
    if (inheritedTests.length) groups.push({key:pkg.id + '-inherited', label:`Included from Package${pkg.number > 2 ? 's' : ''} 1${pkg.number > 2 ? '–' + (pkg.number - 1) : ''}`, tests:inheritedTests, defaultOpen:false});
    groups.push({key:pkg.id + '-direct', label:pkg.number === 1 ? 'Included in Package 1' : 'Additional components in this package', tests:directTests, defaultOpen:true});
    const selected = plan.some(item => item.kind === 'package' && item.id === pkg.id);
    const savingClass = pkg.saving < 0 ? 'comparison-negative' : '';
    const priceHeading = pkg.pricePrefix ? `<small>${escapeHTML(pkg.pricePrefix)}</small>${money(pkg.price)}` : money(pkg.price);
    $('#package-panel').setAttribute('aria-labelledby', 'tab-' + pkg.id);
    $('#package-panel').innerHTML = `<div class="package-layout"><div class="package-detail"><p class="eyebrow">${escapeHTML(pkg.tagline)}</p><div class="package-detail-header"><h3>${escapeHTML(pkg.name)}</h3><span class="component-label">${coveredCount} cumulative components</span></div><p class="package-description">${escapeHTML(pkg.description)}</p><div class="test-groups">${groups.map(group => `<details class="test-group" data-group="${group.key}" ${(openGroups.has(group.key) ? openGroups.get(group.key) : group.defaultOpen) ? 'open' : ''}><summary><span>${escapeHTML(group.label)}<span class="group-count">${group.tests.length} components</span></span></summary>${group.tests.map(testRow).join('')}</details>`).join('')}</div><p class="working-price-note">* Working/prototype price pending a specific quotation or final service definition.</p></div><aside class="package-sidebar" aria-label="${escapeHTML(pkg.name)} summary"><p class="eyebrow">YOUR PACKAGE AT A GLANCE</p><div class="package-price">${priceHeading}</div><p class="price-caption">Proposed package price · current range ${escapeHTML(pkg.priceRange)}</p><div class="package-comparison-summary ${savingClass}"><span><small>À la carte total</small><strong>${money(pkg.aLaCarteTotal)}</strong></span><span><small>Package price</small><strong>${pkg.pricePrefix ? 'From ' : ''}${money(pkg.price)}</strong></span><span><small>Saving / difference</small><strong>${pkg.saving < 0 ? '-' : ''}${money(Math.abs(pkg.saving))}</strong></span></div><p class="package-rationale">${escapeHTML(pkg.rationale)}</p><ul class="package-highlights">${pkg.highlights.map(h => `<li>${escapeHTML(h)}</li>`).join('')}</ul><button class="button primary full" data-add-package="${pkg.id}">${selected ? 'Package added · View plan' : 'Choose this package'} <span aria-hidden="true">${selected ? '✓' : '+'}</span></button><div class="quick-plan-summary" aria-label="Current screening plan total"><span><small>My plan total</small><strong class="plan-total-live">RM0</strong></span><button class="button secondary full" data-action="open-plan">My plan</button><button class="button pay-quick full" data-action="open-payment">Continue to review <span aria-hidden="true">→</span></button></div><p class="sidebar-note">${escapeHTML(pkg.note)}</p></aside></div>`;
  }
  function renderTests() {
    const query = $('#test-search').value.trim().toLowerCase();
    const category = $('#test-category').value;
    const matches = model.tests.filter(test => (category === 'all' || test.category === category) && `${test.name} ${test.category} ${test.description}`.toLowerCase().includes(query));
    const visible = showingAll || query || category !== 'all' ? matches : matches.slice(0,6);
    $('#results-count').textContent = `${visible.length === matches.length ? matches.length : visible.length + ' of ' + matches.length} services${query || category !== 'all' ? ' found' : ''}`;
    $('#reset-filters').hidden = !query && category === 'all';
    $('#show-all-tests').hidden = visible.length === matches.length;
    $('#test-grid').innerHTML = matches.length ? visible.map(test => `<article class="test-card"><div class="test-card-top">${testIcon(test)}<span class="category-pill">${escapeHTML(test.category)}</span></div><h3><button data-detail="${test.id}">${escapeHTML(test.name)}</button></h3><p>${escapeHTML(test.description.split('. ')[0])}${test.description.includes('. ') ? '.' : ''}</p><div class="test-card-bottom"><span class="test-card-price">${testPriceLabel(test)}<small>Listed from Package ${test.introducedIn}${test.provisional ? ' · working price' : ''}${test.optional ? ' · optional pathway' : ''}</small></span>${actionButton(test)}</div></article>`).join('') : '<div class="empty-results"><h3>No matching services.</h3><p>Try another word or clear the filters to explore all available services.</p></div>';
  }
  function renderPackageOffer() {
    const offer = $('#package-offer');
    if (plan.some(item => item.kind === 'package')) {
      offer.innerHTML = '';
      return;
    }
    const comparisons = model.packages.map(pkg => model.comparePackage(plan, pkg.id));
    const fullMatch = comparisons.filter(item => item.fullMatch).sort((a,b) => b.packageNumber - a.packageNumber)[0];
    const progressMatch = comparisons.filter(item => item.matchedCount > 0).sort((a,b) => (b.matchedCount / b.componentCount) - (a.matchedCount / a.componentCount) || a.packageNumber - b.packageNumber)[0];
    if (!fullMatch && !progressMatch) {
      offer.innerHTML = '';
      return;
    }
    if (!fullMatch) {
      const progress = `${progressMatch.matchedCount} of ${progressMatch.componentCount} Package ${progressMatch.packageNumber} components selected`;
      offer.innerHTML = `<aside class="package-match package-match-progress"><p class="eyebrow">PACKAGE COMPARISON</p><strong>${escapeHTML(progress)}</strong><p>Complete the remaining listed components to compare your custom selection with ${escapeHTML(progressMatch.packageName)}.</p></aside>`;
      return;
    }
    const differenceCopy = fullMatch.saving >= 0
      ? `The supplied comparison shows ${money(fullMatch.saving)} below the listed à la carte total.`
      : `The supplied comparison makes this package ${money(Math.abs(fullMatch.saving))} more than the listed components. Confirm the price before commercial use.`;
    offer.innerHTML = `<aside class="package-match package-match-complete"><p class="eyebrow">PACKAGE COMPARISON FOUND</p><h3>Your custom selection matches Package ${fullMatch.packageNumber}.</h3><div class="comparison-prices"><span><small>Listed à la carte total</small><strong>${money(fullMatch.individualTotal)}</strong></span><span><small>Package price</small><strong>${fullMatch.pricePrefix ? 'From ' : ''}${money(fullMatch.packagePrice)}</strong></span><span><small>Saving / difference</small><strong>${fullMatch.saving < 0 ? '-' : ''}${money(Math.abs(fullMatch.saving))}</strong></span></div><p>${escapeHTML(differenceCopy)}</p><button class="button light full" data-switch-package="${fullMatch.packageId}">Choose Package ${fullMatch.packageNumber}</button></aside>`;
  }
  function renderPlan() {
    const summary = model.summarize(plan);
    $$('.plan-count').forEach(count => { count.textContent = summary.count; });
    $$('.plan-total-live').forEach(total => { total.textContent = money(summary.subtotal); });
    $('.plan-trigger').setAttribute('aria-label', `My screening plan, ${summary.count} selected ${summary.count === 1 ? 'item' : 'items'}, indicative total ${money(summary.subtotal)}`);
    renderPackageOffer();
    $('#plan-items').innerHTML = summary.count ? summary.items.map(item => `<article class="plan-item"><div><span class="plan-item-kind">${item.kind === 'package' ? 'Precision screening package' : 'Individual package component'}</span><h3>${escapeHTML(item.name)}</h3>${item.note ? `<small>${escapeHTML(item.note)}</small>` : ''}<button class="remove-item" data-remove="${item.key}" aria-label="Remove ${escapeHTML(item.name)} from plan">Remove</button></div><div class="plan-item-price">${money(item.price)}${item.provisional ? '<small>Working price*</small>' : ''}</div></article>`).join('') : `<div class="empty-plan"><span class="step-symbol" aria-hidden="true">⊕</span><h3>A fresh starting point.</h3><p>Your plan is empty. Choose a precision package or individual components to begin.</p><button class="button primary" data-action="browse-packages">Explore packages ↗</button></div>`;
    $('#plan-warnings').innerHTML = summary.warnings.map(warning => `<p class="plan-warning">${escapeHTML(warning)}</p>`).join('');
    $('#total-label').textContent = 'Indicative total';
    $('#plan-total').textContent = money(summary.subtotal);
    $('#plan-total-note').textContent = !summary.count ? 'Choose a package or individual components to begin.' : summary.needsQuote ? 'This total includes working prices that still require UWC confirmation.' : 'Packages, services and prices are proposed and subject to UWC confirmation.';
    ['download-plan','print-plan','clear-plan'].forEach(id => { $('#' + id).disabled = !summary.count; });
    $$('[data-action="open-payment"]').forEach(button => { button.disabled = !summary.count; });
    $('#payment-item-count').textContent = !summary.count ? 'Choose a package or individual test to continue.' : `You have ${summary.count} selected ${summary.count === 1 ? 'item' : 'items'} ready for review.`;
    $('#payment-total-label').textContent = 'Indicative total';
    $('.privacy-note').textContent = storageAvailable ? 'Saved in this browser only. No appointment, order or payment is submitted.' : 'Browser storage is unavailable; this plan lasts until the page is closed. Nothing is submitted.';
  }
  function update() {
    const focus = document.activeElement;
    const focusContainer = focus.closest('#package-panel, #test-grid, #plan-items, #test-detail');
    const action = focus.dataset.test ? ['test',focus.dataset.test] : focus.dataset.remove ? ['remove',focus.dataset.remove] : focus.dataset.addPackage ? ['add-package',focus.dataset.addPackage] : null;
    saveGroupState();
    try { localStorage.setItem(storageKey, JSON.stringify(plan)); } catch (_) { storageAvailable = false; }
    renderPackage();renderTests();renderPlan();
    if (detailId && $('#test-dialog').open) renderDetail(detailId);
    if (focusContainer && action) {
      const target = $(`[data-${action[0]}="${action[1]}"]`, focusContainer);
      if (target && !target.disabled) target.focus({preventScroll:true});
      else if (focusContainer.id === 'plan-items') $('#plan-title').closest('dialog').querySelector('[data-close]').focus({preventScroll:true});
      else if (focusContainer.id === 'test-detail') $('#test-dialog [data-close]').focus({preventScroll:true});
    }
  }
  function showToast(message) {
    const toast = $('#toast');
    const dialogs = $$('dialog[open]');
    (dialogs.at(-1) || document.body).append(toast);
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('visible'); }, 3300);
  }
  function openDialog(id) {
    const opener = document.activeElement;
    const container = opener.closest('#package-panel, #test-grid, #test-detail, #plan-dialog');
    const attribute = ['data-detail','data-add-package','data-action','data-test','id'].find(name => opener.hasAttribute(name));
    dialogOpeners.set(id,{element:opener,container,attribute,value:attribute ? opener.getAttribute(attribute) : ''});
    $('#' + id).showModal();
    document.body.classList.add('modal-open');
  }
  function confirmChange(message, callback) {
    confirmation = callback;
    $('#confirm-message').textContent = message;
    openDialog('confirm-dialog');
  }
  function addPackage(id) {
    const current = plan.find(item => item.kind === 'package');
    if (current?.id === id) { openDialog('plan-dialog'); return; }
    const selected = model.packages.find(pkg => pkg.id === id);
    const perform = () => {
      plan = model.addPackage(plan,id);update();
      showToast(`${selected.short} package added. Matching individual components were replaced by the package offer.`);
    };
    if (current) {
      const currentPackage = model.packages.find(pkg => pkg.id === current.id);
      confirmChange(`Replace your ${currentPackage.short} package with ${selected.short}? Individual services outside the new package will be kept.`, perform);
    }
    else perform();
  }
  function toggleTest(id) {
    const status = getStatus(id);
    if (status === 'covered') return;
    const test = model.tests.find(t => t.id === id);
    if (status === 'selected') { plan = model.removeItem(plan, 'test:' + id);update();showToast('Removed ' + test.name + ' from your plan.'); }
    else {
      plan = model.addTest(plan,id);update();
      showToast(test.name + ' added to your plan.');
    }
  }
  function renderDetail(id) {
    const test = model.tests.find(t => t.id === id);
    const status = getStatus(test.id);
    const packageNumbers = model.packageNumbersForTest(test.id);
    const packageCopy = 'Listed in Package' + (packageNumbers.length > 1 ? 's ' : ' ') + packageNumbers.join(', ') + '.';
    const reviewCopy = test.provisional
      ? 'This is a working price pending a specific quotation or final service definition.'
      : test.optional
        ? 'This is an optional pathway that can materially change the final quotation.'
        : 'Final service scope, suitability and preparation instructions must be confirmed by UWC.';
    $('#test-detail').innerHTML = `<p class="eyebrow">${escapeHTML(test.category)}</p><h2 id="test-detail-title">${escapeHTML(test.name)}</h2><p class="detail-description">${escapeHTML(test.description)}</p><div class="detail-pricing"><span>Proposed à la carte price</span><strong>${testPriceLabel(test)}</strong></div><p class="detail-note">${escapeHTML(packageCopy + ' ' + reviewCopy)}</p><button class="button primary full" data-test="${test.id}" ${status === 'covered' ? 'disabled' : ''}>${status === 'covered' ? 'Included in your package ✓' : status === 'selected' ? 'Remove from my plan' : 'Add to my plan +'}</button>`;
  }
  function selectPackage(id, focus = false) {
    saveGroupState();activePackage = id;renderTabs();renderPackage();renderPlan();
    if (focus) $('#tab-' + id).focus();
  }
  function setSlide(index) {
    activeSlide = (index + 2) % 2;
    const slides = [
      '<h1>A clearer picture.<br><em>A healthier you.</em></h1><p class="hero-description">Explore four proposed precision-screening packages, compare their listed components and build a personal selection.</p>',
      '<h1>Your next chapter.<br><em>Start with insight.</em></h1><p class="hero-description">Choose a package or build your own selection. When your choices match a package, the prototype shows the supplied price difference.</p>'
    ];
    $('#hero-text').innerHTML = slides[activeSlide];
    $$('.slide-dots button').forEach((button,index) => button.setAttribute('aria-current', String(index === activeSlide)));
  }
  function summaryText() {
    const summary = model.summarize(plan);
    return ['UMBI WELLNESS CENTRE — SCREENING PLAN','Prototype selection for discussion only', 'Date: ' + new Date().toLocaleDateString('en-MY'),'',...summary.items.flatMap(item => [`${item.kind === 'package' ? 'PACKAGE' : 'TEST / SERVICE'}: ${item.name}`,'Proposed price: ' + money(item.price) + (item.provisional ? ' (working price)' : ''),item.note || '','']),`INDICATIVE TOTAL: ${money(summary.subtotal)}`,'',...summary.warnings.map(w => 'REVIEW: ' + w),'','Packages, services and prices are proposed figures subject to UWC confirmation. This is not a final quote.','No appointment, order or payment has been created. Nothing has been sent to UWC.','Screening suitability should be discussed with a qualified healthcare professional.'].join('\r\n');
  }
  function downloadPlan() {
    const blob = new Blob(['\uFEFF' + summaryText()],{type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;anchor.download = 'UWC-Screening-Plan.txt';
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    showToast('Review summary prepared. If no file appears, use Print plan. Nothing was submitted.');
  }
  function printPlan() {
    const summary = model.summarize(plan);
    $('#print-summary').innerHTML = `<h1>UMBI Wellness Centre</h1><h2>Screening plan · Prototype review</h2><p>${escapeHTML(new Date().toLocaleDateString('en-MY'))}</p><table><thead><tr><th>Selected package / service</th><th>Proposed price</th></tr></thead><tbody>${summary.items.map(item => `<tr><td>${escapeHTML(item.name)}<small>${escapeHTML(item.note || '')}</small></td><td>${money(item.price)}${item.provisional ? '<small>Working price*</small>' : ''}</td></tr>`).join('')}</tbody></table><h2>Indicative total: ${money(summary.subtotal)}</h2><ul>${summary.warnings.map(w => `<li>${escapeHTML(w)}</li>`).join('')}</ul><p>Packages, services and prices are proposed figures subject to UWC confirmation. This is not a final quote.</p><p>No appointment, order or payment has been created. Nothing has been submitted. Discuss screening suitability with a qualified healthcare professional.</p>`;
    window.print();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.close) $('#' + button.dataset.close).close();
    else if (button.dataset.packageTab) selectPackage(button.dataset.packageTab,true);
    else if (button.dataset.addPackage) addPackage(button.dataset.addPackage);
    else if (button.dataset.switchPackage) addPackage(button.dataset.switchPackage);
    else if (button.dataset.test) toggleTest(button.dataset.test);
    else if (button.dataset.detail) { detailId = button.dataset.detail;renderDetail(detailId);openDialog('test-dialog'); }
    else if (button.dataset.remove) { plan = model.removeItem(plan,button.dataset.remove);update();showToast('Selection removed from your plan.'); }
    else if (button.dataset.action === 'open-plan') {if ($('#payment-dialog').open) $('#payment-dialog').close();renderPlan();openDialog('plan-dialog');}
    else if (button.dataset.action === 'open-payment') {if ($('#plan-dialog').open) $('#plan-dialog').close();renderPlan();openDialog('payment-dialog');}
    else if (button.dataset.action === 'browse-packages') {$('#plan-dialog').close();$('#packages').scrollIntoView();$('#tab-' + activePackage).focus({preventScroll:true});}
    else if (button.dataset.slide !== undefined) setSlide(button.dataset.slide === 'previous' ? activeSlide - 1 : button.dataset.slide === 'next' ? activeSlide + 1 : Number(button.dataset.slide));
  });
  $('#package-tabs').addEventListener('keydown', event => {
    const index = model.packages.findIndex(pkg => pkg.id === activePackage);
    const count = model.packages.length;
    const next = {ArrowRight:(index+1)%count,ArrowLeft:(index+count-1)%count,Home:0,End:count-1}[event.key];
    if (next === undefined) return;
    event.preventDefault();selectPackage(model.packages[next].id,true);
  });
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => {
      if (dialog.contains($('#toast'))) document.body.append($('#toast'));
      document.body.classList.toggle('modal-open',!!$('dialog[open]'));
      if (dialog.id === 'test-dialog') detailId = null;
      const opener = dialogOpeners.get(dialog.id);
      if (opener) {
        const target = opener.element.isConnected ? opener.element : opener.attribute ? $(`[${opener.attribute}="${opener.value}"]`,opener.container?.isConnected ? opener.container : document) : null;
        if (target && !target.disabled) target.focus({preventScroll:true});
        else $('dialog[open] [data-close]')?.focus({preventScroll:true});
      }
    });
    dialog.addEventListener('click', event => {if (event.target === dialog) { const rect = dialog.getBoundingClientRect();if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }});
  });
  $('#confirm-action').addEventListener('click', () => { const action = confirmation;confirmation = null;$('#confirm-dialog').close();if (action) action(); });
  $('#clear-plan').addEventListener('click', () => confirmChange('Remove every package and test from this browser’s screening plan? You can build a new plan at any time.', () => {plan = model.createPlan();update();showToast('Your plan has been cleared.');}));
  $('#download-plan').addEventListener('click', downloadPlan);
  $('#print-plan').addEventListener('click', printPlan);
  $('#test-search').addEventListener('input', renderTests);
  $('#test-category').addEventListener('change', renderTests);
  $('#reset-filters').addEventListener('click', () => {$('#test-search').value = '';$('#test-category').value = 'all';renderTests();$('#test-search').focus();});
  $('#show-all-tests').addEventListener('click', () => {showingAll = true;renderTests();const firstNew = $$('#test-grid [data-detail]')[6];if (firstNew) firstNew.focus({preventScroll:true});});
  $('#test-category').insertAdjacentHTML('beforeend', [...new Set(model.tests.map(test => test.category))].map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join(''));
  renderTabs();renderPackage();renderTests();renderPlan();loadPrototypeStatus();
}());
