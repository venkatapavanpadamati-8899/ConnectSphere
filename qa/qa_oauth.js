const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // We expect the local server is running on 3000
    await page.goto('http://localhost:3000/login.html');
    
    // Setup request interception to catch the OAuth redirect
    await page.setRequestInterception(true);
    let providerError = null;
    let redirectedToGoogle = false;

    page.on('request', request => {
        const url = request.url();
        if (url.includes('google.com/o/oauth2/v2/auth') || url.includes('accounts.google.com')) {
            console.log("Redirected to Google successfully.");
            redirectedToGoogle = true;
            // Abort to prevent actually going there
            request.abort();
        } else {
            request.continue();
        }
    });

    page.on('response', async response => {
        const url = response.url();
        if (url.includes('authorize?provider=google')) {
            const status = response.status();
            if (status >= 400) {
                console.log(`OAuth Authorization Error: ${status}`);
                providerError = true;
            }
        }
    });

    // Wait for the google login button
    try {
        await page.waitForSelector('#googleLoginBtn', { timeout: 3000 });
        const buttons = await page.$$('#googleLoginBtn');
        
        let googleBtn = null;
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Google')) {
                googleBtn = btn;
                break;
            }
        }
        
        if (googleBtn) {
            console.log("Clicking Google OAuth button...");
            await googleBtn.click();
            await new Promise(r => setTimeout(r, 3000));
            
            if (redirectedToGoogle) {
                console.log("RESULT: OAuth flow reached Google.");
            } else if (providerError) {
                console.log("RESULT: BLOCKED - SUPABASE GOOGLE PROVIDER CONFIGURATION REQUIRED");
            } else {
                console.log("RESULT: No redirection or clear error occurred.");
                
                // Let's check for any URL changes
                const finalUrl = page.url();
                console.log("Final URL:", finalUrl);
                
                if (finalUrl.includes('error=server_error') || finalUrl.includes('error_description=Error+getting+provider')) {
                    console.log("RESULT: BLOCKED - SUPABASE GOOGLE PROVIDER CONFIGURATION REQUIRED");
                }
            }
        } else {
            console.log("Google OAuth button not found.");
        }
    } catch (err) {
        console.error("Error during test:", err);
    }
    
    await browser.close();
})();
