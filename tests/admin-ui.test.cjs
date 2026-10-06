const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const flush = async () => { for(let i=0;i<8;i++) await new Promise(resolve=>setImmediate(resolve)); };

function harness() {
  const dom = new JSDOM(fs.readFileSync('admin/index.html','utf8'), {url:'https://test.invalid/admin/',runScripts:'outside-only'});
  const w=dom.window, doc=w.document;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  let loggedIn=false, failList=false, signupCount=0, resolveSave=null, failSave=false, changeCallback;
  const calls=[];
  const record={id:'booking',booking_code:'BK-ABCDEFGHJKMN',customer_name:'Test Visitor',customer_email:'visitor@example.invalid',customer_phone:'+60000000000',
    package_name:'Precision Baseline Health Screening',scheduled_at:'2026-12-01T01:00:00Z',duration_minutes:60,status:'pending_review',payment_status:'pending',
    amount_due:450,amount_paid:0,is_demo:true,created_at:'2026-10-06T01:00:00Z',updated_at:'2026-10-06T01:00:00Z',plan_snapshot:{items:[]},notes:[],events:[]};
  const user={id:'staff',email:'staff@example.invalid'};
  w.UWCAdminData={
    approvedUser:async()=>loggedIn?user:null,
    signIn:async()=>{loggedIn=true;return user;}, signUp:async()=>{signupCount++;return false;},
    signOut:async()=>{loggedIn=false;},
    list:async()=>{if(failList) throw new TypeError('offline');return [structuredClone(record)];},
    details:async()=>structuredClone(record),
    save:async(booking,action,note,date,suggestions)=>{
      calls.push({booking,action,note,date,suggestions});
      await new Promise(resolve=>{resolveSave=resolve;});
      if(failSave) throw new Error('This booking changed. Refresh its details before saving.');
      record.status='confirmed'; record.updated_at='2026-10-06T02:00:00Z'; return {status:'confirmed',conflicts:0};
    },
    subscribe:callback=>{changeCallback=callback;return ()=>{};},onAuthChange:()=>()=>{}
  };
  w.eval(fs.readFileSync('appointment-rules.js','utf8')); w.eval(fs.readFileSync('admin.js','utf8'));
  const click=selector=>doc.querySelector(selector).click();
  const submit=selector=>doc.querySelector(selector).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const login=async()=>{doc.querySelector('#email').value=user.email;doc.querySelector('#password').value='test-only-stub';submit('#login-form');await flush();};
  return {w,doc,calls,click,submit,login,record,signupCount:()=>signupCount,failList:()=>{failList=true;},failSave:()=>{failSave=true;},resolve:()=>resolveSave(),change:()=>changeCallback(),close:()=>w.close()};
}
test('dashboard initially hides bookings and ignores the old demo flag',async()=>{
  const h=harness();await flush(); assert.equal(h.doc.querySelector('#dashboard').hidden,true); assert.equal(h.doc.querySelector('#appointment-rows').children.length,0);h.close();
});
test('approved sign-in loads stored bookings; search and payment filter work',async()=>{
  const h=harness(); await h.login(); assert.equal(h.doc.querySelector('#dashboard').hidden,false);
  assert.match(h.doc.querySelector('#appointment-rows').textContent,/BK-ABCDEFGHJKMN/);
  const search=h.doc.querySelector('#search');search.value='unmatched';search.dispatchEvent(new h.w.Event('input'));
  assert.match(h.doc.querySelector('#appointment-rows').textContent,/No appointments/);
  search.value='';search.dispatchEvent(new h.w.Event('input'));
  const filter=h.doc.querySelector('#filter-payment');filter.value='paid';filter.dispatchEvent(new h.w.Event('change'));
  assert.match(h.doc.querySelector('#appointment-rows').textContent,/No appointments/);h.close();
});
test('saved action waits for the server, blocks double submit and refreshes details',async()=>{
  const h=harness();await h.login();h.click('#appointment-rows button');await flush();
  const approve=[...h.doc.querySelectorAll('.action-grid button')].find(b=>b.textContent==='Approve');approve.click();
  h.submit('#action-form');await flush();assert.equal(h.doc.querySelector('#confirm-action').disabled,true);
  h.submit('#action-form');await flush();assert.equal(h.calls.length,1);assert.equal(h.record.status,'pending_review');
  h.resolve();await flush();assert.equal(h.record.status,'confirmed');assert.match(h.doc.querySelector('#details-content').textContent,/Confirmed/);
  assert.match(h.doc.querySelector('#dashboard-message').textContent,/Saved to Supabase/);h.close();
});
test('a rejected/stale action is not applied optimistically and its form stays open',async()=>{
  const h=harness();await h.login();h.click('#appointment-rows button');await flush();
  [...h.doc.querySelectorAll('.action-grid button')].find(b=>b.textContent==='Approve').click();h.failSave();h.submit('#action-form');await flush();h.resolve();await flush();
  assert.equal(h.record.status,'pending_review');assert.equal(h.doc.querySelector('#action-dialog').open,true);assert.match(h.doc.querySelector('#action-message').textContent,/changed/);h.close();
});
test('network/permission refresh failure locks the dashboard and removes personal data',async()=>{
  const h=harness();await h.login();h.click('#appointment-rows button');await flush();h.failList();h.click('#refresh');await flush();
  assert.equal(h.doc.querySelector('#dashboard').hidden,true);assert.equal(h.doc.querySelector('#details-dialog').open,false);
  assert.equal(h.doc.querySelector('#appointment-rows').textContent,'');assert.equal(h.doc.querySelector('#details-content').textContent,'');h.close();
});
test('account creation validates confirmation and never opens bookings',async()=>{
  const h=harness();await flush();h.click('#auth-toggle');h.doc.querySelector('#email').value='staff@example.invalid';
  h.doc.querySelector('#password').value='a-long-test-password';h.doc.querySelector('#confirm-password').value='different';h.submit('#login-form');await flush();
  assert.equal(h.signupCount(),0);h.doc.querySelector('#confirm-password').value='a-long-test-password';h.submit('#login-form');await flush();
  assert.equal(h.signupCount(),1);assert.equal(h.doc.querySelector('#dashboard').hidden,true);assert.match(h.doc.querySelector('#login-message').textContent,/confirmation email/);h.close();
});
test('sign-out removes stored bookings, search terms and open details',async()=>{
  const h=harness();await h.login();h.click('#appointment-rows button');await flush();h.doc.querySelector('#search').value='visitor';h.click('#sign-out');await flush();
  assert.equal(h.doc.querySelector('#dashboard').hidden,true);assert.equal(h.doc.querySelector('#details-content').textContent,'');assert.equal(h.doc.querySelector('#search').value,'');h.close();
});
