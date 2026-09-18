const puppeteer = require('puppeteer');

(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await p.type('#email', 'qaA_1789569805612@test.com');
  await p.type('#password', 'Password123!');
  await p.click('#loginBtn');
  await new Promise(r => setTimeout(r, 3000));
  await p.setViewport({ width: 320, height: 700 });

  for (const route of ['reels', 'messages', 'explore']) {
    await p.goto('http://localhost:3000/' + route, { waitUntil: 'networkidle2' });
    const clipped = await p.evaluate(() => {
      const cw = window.innerWidth;
      const res = [];
      const interactive = Array.from(document.querySelectorAll('button:not([hidden]), input:not([type="hidden"]), textarea, a.cs-btn-primary'));
      for (const el of interactive) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          if (r.right > cw + 5 || r.left < -5) {
            const cs = window.getComputedStyle(el);
            res.push({
              tag: el.tagName,
              id: el.id,
              cls: el.className,
              left: r.left,
              right: r.right,
              cw: cw,
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity
            });
          }
        }
      }
      return res;
    });
    console.log(route + ' clipped:', JSON.stringify(clipped, null, 2));
  }
  await b.close();
})();
