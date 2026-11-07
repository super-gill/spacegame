const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, n] of [[1300, 'desk'], [400, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 }); p.on('pageerror', (e) => errs.push(e.message));
    await p.setContent('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body>' + require('fs').readFileSync('sol-chart.html', 'utf8') + '</body></html>');
    await p.waitForTimeout(800); await p.screenshot({ path: n + '.png', fullPage: n === 'desk' });
    console.log(n, 'scrollW', await p.evaluate(() => document.body.scrollWidth));
  }
  console.log('errors', errs); await b.close();
})();
