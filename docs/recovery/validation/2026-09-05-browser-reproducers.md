# 2026-09-05 — browser verification reproducers

These scripts were used with built/local application servers and mocked score/session APIs. They do not call production mutation endpoints. The fixed local test secret is deliberately not a production credential. Screenshots were visually inspected during the session; results are recorded in the issue-specific validation files.

Run from the repository root after `npm run build`, using a separate terminal for:

```sh
NEXTAUTH_SECRET=clairkeys-local-tempo-validation npm run start -- --port 3101 --hostname 127.0.0.1
```

Each CommonJS block uses repository-installed Playwright and dependencies. For the timing notice script, materialize the MXL bytes from `fixtures/musicxml-timing/clair-de-lune-recognition.json` into `/private/tmp/clairkeys-134.mxl` first; this contains XML only, not a PDF. The exact archive hash is in that fixture.

## Tempo unit and owner-edit flow (PR #139)

```javascript
const { createRequire } = require('module');
const req = createRequire(process.cwd() + '/package.json');
const { chromium } = req('playwright');
const { encode } = req('next-auth/jwt');
const assert = require('assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const token = await encode({ token: { sub: 'test-owner', id: 'test-owner' }, secret: 'clairkeys-local-tempo-validation' });
  await context.addCookies([{ name: 'next-auth.session-token', value: token, domain: '127.0.0.1', path: '/' }]);
  const sheet = { id: 1, title: '테스트 악보', composer: 'Test', userId: 'test-owner', isPublic: false,
    availability: 'ready', provenance: 'omr', categoryId: null, category: null, animationDataUrl: 'https://example.invalid/score.json',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  let submitted;
  await context.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: 'test-owner', name: 'Test' }, expires: '2099-01-01' } }));
  await context.route('**/api/categories', route => route.fulfill({ json: [] }));
  await context.route('**/api/sheet**', route => {
    if (route.request().method() === 'PUT') {
      submitted = route.request().postDataJSON();
      return route.fulfill({ json: { success: true, sheetMusic: { ...sheet, ...submitted } } });
    }
    return route.fulfill({ json: { success: true, sheetMusic: [sheet] } });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3101/library');
  await page.getByRole('button', { name: '테스트 악보 제목 수정' }).click();
  await page.getByLabel('빠르기 (BPM)').fill('46');
  await page.getByLabel('박 단위').selectOption('dotted-quarter');
  assert.match(await page.getByRole('dialog').innerText(), /♩=69/);
  await page.getByLabel('빠르기 (BPM)').hover();
  await page.mouse.wheel(0, 120);
  assert.equal(await page.getByLabel('빠르기 (BPM)').inputValue(), '46');
  const box = await page.getByRole('dialog').locator('form').boundingBox();
  assert(box.x >= 0 && box.x + box.width <= 390 && box.height <= 844);
  await page.screenshot({ path: '/private/tmp/clairkeys-tempo-mobile.png' });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(submitted.tempo, 69);
  await page.goto('http://127.0.0.1:3101/upload');
  await page.getByLabel('빠르기 (BPM)').waitFor();
  assert.match(await page.locator('body').innerText(), /악보의 빠르기를 자동으로 읽습니다/);
  await page.getByLabel('빠르기 (BPM)').fill('46');
  await page.getByLabel('박 단위').selectOption('dotted-quarter');
  assert.match(await page.locator('body').innerText(), /♩=69/);
  console.log('PASS: Chromium 390x844 upload/edit, dotted 46 -> quarter 69 PUT, wheel unchanged, dialog fits viewport. Session and API responses mocked; no production write.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
```

## Held-note display and actual local playback (PR #140)

```javascript
const { createRequire } = require('module');
const req = createRequire(process.cwd() + '/package.json');
const { chromium } = req('playwright');
const fs = require('fs');
const assert = require('assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const score = JSON.parse(fs.readFileSync('fixtures/fingering/gymnopedie-283.json'));
  await context.route('**/api/auth/session', r => r.fulfill({ json: {} }));
  await context.route('**/api/sheet/1', r => r.fulfill({ json: { success: true, sheetMusic: {
    id: 1, title: score.title, composer: score.composer, isPublic: true, availability: 'ready',
    animationDataUrl: 'http://127.0.0.1:3101/test-score.json', category: null, owner: null,
  } } }));
  await context.route('**/test-score.json', r => r.fulfill({ json: score }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:3101/sheet/1');
  await page.getByRole('note').waitFor();
  assert.match(await page.getByRole('note').innerText(), /자동 연습 제안/);
  assert(await page.locator('[data-sustaining="true"]').count() > 0);
  assert.equal(await page.locator('[data-sustaining="true"] [class*="font-black"]').count(), 0);
  await page.getByRole('button', { name: '재생', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).waitFor();
  await page.waitForTimeout(1100);
  const bassPressed = await page.getByLabel('C2 octave marker').evaluate(marker => {
    const c2 = marker.parentElement;
    const whites = [...c2.parentElement.children].filter(key => key.style.zIndex === '10');
    const g2 = whites[whites.indexOf(c2) + 4];
    return g2.classList.contains('bg-blue-200');
  });
  assert.equal(bassPressed, false, 'G2 must be released after the upper chord onset');
  await page.screenshot({ path: '/private/tmp/clairkeys-held-playing.png' });
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  assert.deepEqual(errors, []);
  console.log('PASS: real built player at 844x390, inferred guidance caption, translucent sustaining tails without finger badges, G2 not pressed after upper-chord onset, no page errors. Public score/session API mocked; local Web Audio/sample path used.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
```

## Real recognition warning on a narrow viewport (PR #141)

```javascript
const {createRequire}=require('module'); const req=createRequire(process.cwd()+'/package.json');
const {chromium}=req('playwright'); const {execFileSync}=require('child_process'); const assert=require('assert/strict');
(async()=>{
  const score=JSON.parse(execFileSync('python3',['-m','omr.cli','/private/tmp/clairkeys-134.mxl','--tempo','46'],{cwd:process.cwd()+'/omr-service',encoding:'utf8'}));
  const browser=await chromium.launch({headless:true}); const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/api/auth/session',r=>r.fulfill({json:{}}));
  await context.route('**/api/sheet/1',r=>r.fulfill({json:{success:true,sheetMusic:{id:1,title:'Clair de lune',composer:'Debussy',isPublic:true,availability:'ready',animationDataUrl:'http://127.0.0.1:3101/test-score.json',category:null,owner:null}}}));
  await context.route('**/test-score.json',r=>r.fulfill({json:score}));
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3101/sheet/1');
  const notice=page.getByRole('status').filter({hasText:'리듬 확인이 필요합니다'});
  await notice.waitFor(); await notice.scrollIntoViewIfNeeded();
  assert.match(await notice.innerText(),/10개 마디/); assert.match(await notice.innerText(),/1마디, 2마디, 3마디/);
  assert.match(await notice.innerText(),/자동으로 고친 결과가 아닙니다/);
  const box=await notice.boundingBox(); assert(box.x>=0&&box.x+box.width<=390);
  await page.screenshot({path:'/private/tmp/clairkeys-timing-notice.png'}); assert.deepEqual(errors,[]);
  console.log('PASS: built Chromium 390x844, real converter output, 10 overfull measures, explicit non-correction explanation, no overflow or page errors. Score/session API mocked.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
```
