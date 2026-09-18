const https = require('https');

https.get('https://connectsphere2.vercel.app/css/backgrounds.css', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Includes clip-path?', data.includes('clip-path'));
    console.log('Includes contain: strict?', data.includes('contain: strict'));
    console.log('Length:', data.length);
    console.log('First 200 chars:', data.slice(0, 200));
  });
});
