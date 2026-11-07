const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  for (const k of process.argv.slice(2)) { await p.goto('file://' + process.cwd() + '/registry.html#' + k); await p.waitForTimeout(500); await (await p.$('.cols')).screenshot({ path: 'fit-' + k + '.png' }); }
  console.log('errors:', errs.length, errs.slice(0, 3)); await b.close();
})();
