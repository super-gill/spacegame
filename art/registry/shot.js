const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  for (const k of process.argv.slice(2)) { await p.goto('file://' + process.cwd() + '/registry.html#' + k); await p.waitForTimeout(400); await (await p.$('#stage')).screenshot({ path: 'shot-' + k + '.png' }); }
  await b.close();
})();
