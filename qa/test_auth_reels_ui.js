const puppeteer = require('puppeteer');

(async () => {
  const b = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--window-size=1440,900']
  });
  const p = await b.newPage();
  
  console.log('1. Logging in with real user qaA...');
  await p.goto('https://connectsphere2.vercel.app/login', { waitUntil: 'networkidle2' });
  await p.type('#email', 'qaA_1789569805612@test.com');
  await p.type('#password', 'Password123!');
  await p.click('#loginBtn');
  await new Promise(r => setTimeout(r, 4000));
  console.log('Logged in URL:', p.url());

  console.log('--- TESTING LOCAL REELS ---');
  await p.goto('http://localhost:3000/reels', { waitUntil: 'networkidle2' });
  const localTrending = await p.$('#trending-masterpiece-list');
  console.log('LOCAL Has #trending-masterpiece-list:', !!localTrending);
  const localShare = await p.$('#btn-reel-share');
  console.log('LOCAL Has #btn-reel-share:', !!localShare);
  if (localTrending) {
    const txt = await p.$eval('#trending-masterpiece-list', el => el.innerText);
    console.log('LOCAL Trending text:\n', txt.slice(0, 300));
  }

  console.log('\n--- TESTING REMOTE VERCEL REELS (UNAUTHENTICATED) ---');
  await p.goto('https://connectsphere2.vercel.app/reels', { waitUntil: 'networkidle2' });
  console.log('Vercel /reels URL:', p.url());

  console.log('\n--- TESTING REMOTE VERCEL REELS (AUTHENTICATED) ---');
  await p.goto('https://connectsphere2.vercel.app/login', { waitUntil: 'networkidle2' });
  await p.type('#email', 'qaA_1789569805612@test.com');
  await p.type('#password', 'Password123!');
  await p.click('#loginBtn');
  await new Promise(r => setTimeout(r, 4000));
  await p.goto('https://connectsphere2.vercel.app/pages/reels.html', { waitUntil: 'networkidle2' });
  console.log('Authenticated Vercel Reels URL:', p.url());
  const remoteTrending = await p.$('#trending-masterpiece-list');
  console.log('REMOTE Has #trending-masterpiece-list:', !!remoteTrending);
  const remoteShare = await p.$('#btn-reel-share');
  console.log('REMOTE Has #btn-reel-share:', !!remoteShare);

  await b.close();
})();
