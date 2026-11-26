/* Test de bout en bout dans un vrai navigateur : npm run build && npm run test:e2e
   Sert dist/ avec Vite, puis vérifie plan, mesure, fiche pièce, points à vérifier, 3D et mobile.
   Demande Playwright et Chromium (npm i -D playwright && npx playwright install chromium) si absents,
   ou PLAYWRIGHT_MODULE=<chemin vers playwright/index.js> pour utiliser une installation existante. */
import { preview } from 'vite';

let chromium, devices;
try { const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'); ({ chromium, devices } = pw.chromium ? pw : pw.default); }
catch { console.error('Playwright absent : npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'silent' });
const base = server.resolvedUrls.local[0];
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'ÉCHEC ') + what); if (!ok) fails.push(what); };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  /* ---------- ordinateur ---------- */
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(90000); // rendu logiciel lent sans carte graphique
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + '?diag=1');
  await page.waitForSelector('#plan .room');
  check(await page.locator('#title h1').innerText() === 'Villa M3 · Rez-de-chaussée', 'titre');
  check(await page.locator('.tab .n').innerText() === '10', '10 points à vérifier');

  /* fiche pièce depuis le panneau */
  await page.getByRole('button', { name: /Suite parentale/ }).click();
  check((await page.locator('#info').innerText()).includes('19,70 m²'), 'fiche de la suite : 19,70 m²');
  await page.keyboard.press('Escape');

  /* mesure aimantée : largeur intérieure du séjour, de 6,55 à 17,95 m */
  const toScreen = (x, y) => page.evaluate(([x, y]) => { const s = document.querySelector('#plan'), p = s.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(s.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
  await page.keyboard.press('f'); await page.waitForTimeout(200);
  await page.keyboard.press('m');
  for (const [x, y] of [[6.55, 14], [17.95, 14]]) { const [sx, sy] = await toScreen(x, y); await page.mouse.click(sx, sy); }
  check(await page.getByTestId('mesure').textContent() === '11,40 m', 'mesure 11,40 m');
  await page.keyboard.press('Escape');

  /* point à vérifier : recadrage et surlignage */
  await page.getByRole('tab', { name: /À vérifier/ }).click();
  await page.getByRole('button', { name: /Profondeur du parking/ }).click();
  check(await page.waitForSelector('#focus rect', { timeout: 3000 }).then(() => true, () => false), 'focus sur le parking');
  await page.getByRole('tab', { name: /Pièces/ }).click();

  /* 3D et visite */
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#diag')?.textContent?.includes('chargée'), null, { timeout: 30000 }).catch(() => {});
  check(await page.locator('#gl').isVisible(), 'canvas 3D visible');
  check((await page.locator('#diag').innerText()).includes('chargée'), 'lumière pré-calculée chargée');
  await page.getByRole('button', { name: 'Étage' }).click();
  await page.waitForTimeout(500);
  check(await page.getByRole('button', { name: 'Visite', exact: true }).count() === 0, 'mode visite retiré');
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  check(await page.locator('#plan').isVisible(), 'retour au plan');
  check(errors.length === 0, 'aucune erreur dans la console' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await page.close();

  /* ---------- téléphone ---------- */
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await ctx.newPage();
  const mErrors = []; m.on('pageerror', e => mErrors.push(e.message));
  await m.goto(base); await m.waitForSelector('#plan .room');
  check(await m.locator('#sheetBtn').isVisible(), 'mobile : bouton du tiroir');
  await m.locator('#sheetBtn').click(); await m.waitForTimeout(400);
  check(await m.locator('#side.open').count() === 1, 'mobile : tiroir ouvert');
  check(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile : pas de défilement horizontal');
  check(mErrors.length === 0, 'mobile : aucune erreur');
  await ctx.close();
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(r));
}
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon.');
process.exit(fails.length ? 1 : 0);
