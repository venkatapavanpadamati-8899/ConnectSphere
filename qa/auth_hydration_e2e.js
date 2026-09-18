const puppeteer = require('puppeteer');

(async () => {
    let browser;
    let page;
    try {
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'] 
        });
        page = await browser.newPage();
        
        const BASE_URL = 'https://connectsphere2.vercel.app';
        
        console.log(`--- AUTH SESSION HYDRATION TEST ---`);
        console.log(`Target: ${BASE_URL}\n`);

        // 1. Login successfully
        await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'load' });
        await page.waitForSelector('#email');
        await page.type('#email', `creator@connectsphere.com`);
        await page.type('#password', 'SpherePassword2026!');
        await page.click('#loginBtn');
        
        console.log('Waiting for URL to change to dashboard...');
        await page.waitForFunction(
            () => window.location.href.includes('dashboard'),
            { timeout: 10000 }
        );
        console.log('✅ PASS Login successful');

        // 2. Clear application-local state (but leave Supabase auth token)
        await page.evaluate(() => {
            if (window.csStore) window.csStore.set('currentUser', null);
            localStorage.removeItem('currentUser');
        });
        
        const storeBefore = await page.evaluate(() => window.csStore ? window.csStore.get('currentUser') : null);
        console.log(`✅ PASS App state cleared (currentUser: ${storeBefore})`);

        // 3. Reload a protected route directly
        await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'load' });
        
        // 4. Verify Supabase session is restored and user hydrates
        await new Promise(r => setTimeout(r, 2000)); // wait for hydration
        
        const isDashboard = page.url().includes('dashboard');
        console.log(`✅ PASS Reloaded protected route (stayed on dashboard: ${isDashboard})`);
        
        if (!isDashboard) {
            throw new Error('Redirected to login incorrectly.');
        }

        const hydratedUser = await page.evaluate(() => window.csStore ? window.csStore.get('currentUser') : null);
        if (hydratedUser && (hydratedUser.email === 'creator@connectsphere.com' || hydratedUser.id)) {
            console.log(`✅ PASS Profile state hydrated (id: ${hydratedUser.id})`);
        } else {
            console.error('Failed to hydrate', hydratedUser);
            throw new Error('Profile state did not hydrate');
        }

        // 5. Logout
        await page.click('.cs-logout-btn, #logoutBtn');
        await page.waitForFunction(
            () => window.location.href.includes('login'),
            { timeout: 10000 }
        );
        console.log('✅ PASS Logout successful');

        // 6. Verify protected route redirects to login
        await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'load' });
        await page.waitForFunction(
            () => window.location.href.includes('login'),
            { timeout: 10000 }
        );
        console.log('✅ PASS Protected route redirects to login after logout');

        console.log('\n✅ HYDRATION TEST COMPLETE - PASS');
        await browser.close();
    } catch (e) {
        console.error('\n❌ FAIL: ', e.message);
        if (page) await page.screenshot({ path: 'qa/hydration_fail.png' });
        if (browser) await browser.close();
        process.exit(1);
    }
})();
