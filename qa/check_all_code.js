const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('   CONNECTSPHERE — FULL CODEBASE AUDIT & VERIFICATION SUITE   ');
console.log('================================================================\n');

function walkDir(dir, filterExt) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath, filterExt));
    } else {
      if (!filterExt || file.endsWith(filterExt)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const jsFiles = walkDir('frontend/js', '.js');
console.log(`[1] Scanning ${jsFiles.length} JavaScript files for syntax & compile validity...`);

let jsErrors = [];
for (const file of jsFiles) {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    console.log(`  [OK] ${file.replace(/\\/g, '/')}`);
  } catch (err) {
    console.error(`  [FAIL] ${file.replace(/\\/g, '/')}: ${err.message}`);
    jsErrors.push({ file, error: err.message });
  }
}

console.log(`\nJavaScript Syntax Scan Results: ${jsFiles.length - jsErrors.length}/${jsFiles.length} PASSED.`);

// Check HTML files
const htmlFiles = walkDir('frontend/pages', '.html');
console.log(`\n[2] Scanning ${htmlFiles.length} HTML pages for asset references & link integrity...`);

let htmlErrors = [];
for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  
  // Find all <link rel="stylesheet" href="...">
  const cssMatches = content.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi);
  for (const m of cssMatches) {
    const href = m[1].split('?')[0];
    if (!href.startsWith('http')) {
      const target = path.resolve(dir, href);
      if (!fs.existsSync(target)) {
        htmlErrors.push({ file, type: 'Missing CSS', target: href });
        console.warn(`  [MISSING CSS] in ${file.replace(/\\/g, '/')}: ${href}`);
      }
    }
  }

  // Find all <script src="...">
  const jsMatches = content.matchAll(/<script[^>]+src=["']([^"']+\.js[^"']*)["']/gi);
  for (const m of jsMatches) {
    const src = m[1].split('?')[0];
    if (!src.startsWith('http')) {
      const target = path.resolve(dir, src);
      if (!fs.existsSync(target)) {
        htmlErrors.push({ file, type: 'Missing JS', target: src });
        console.warn(`  [MISSING JS] in ${file.replace(/\\/g, '/')}: ${src}`);
      }
    }
  }

  // Find all <img src="...">
  const imgMatches = content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const m of imgMatches) {
    const src = m[1].split('?')[0];
    if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && !src.includes('${')) {
      const target = path.resolve(dir, src);
      if (!fs.existsSync(target)) {
        htmlErrors.push({ file, type: 'Missing Image', target: src });
        console.warn(`  [MISSING IMG] in ${file.replace(/\\/g, '/')}: ${src}`);
      }
    }
  }
}

if (htmlErrors.length === 0) {
  console.log(`  [OK] All HTML page local script, stylesheet, and static image references exist!`);
}

// Check CSS files for broken url(...) references
const cssFiles = walkDir('frontend/css', '.css');
console.log(`\n[3] Scanning ${cssFiles.length} CSS files for background and font url(...) paths...`);

let cssErrors = [];
for (const file of cssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const urlMatches = content.matchAll(/url\(['"]?([^'")]+)['"]?\)/gi);
  for (const m of urlMatches) {
    const targetUrl = m[1].split('?')[0].split('#')[0];
    if (!targetUrl.startsWith('http') && !targetUrl.startsWith('data:') && !targetUrl.startsWith('chrome:')) {
      const resolved = path.resolve(dir, targetUrl);
      if (!fs.existsSync(resolved)) {
        cssErrors.push({ file, target: targetUrl });
        console.warn(`  [MISSING ASSET] in ${file.replace(/\\/g, '/')}: ${targetUrl}`);
      }
    }
  }
}

if (cssErrors.length === 0) {
  console.log(`  [OK] All CSS url(...) assets exist on disk!`);
}

console.log('\n================================================================');
console.log('                     AUDIT SUMMARY RESULTS                     ');
console.log('================================================================');
console.log(`JS Files Tested: ${jsFiles.length} | Errors: ${jsErrors.length}`);
console.log(`HTML Files Tested: ${htmlFiles.length} | Errors: ${htmlErrors.length}`);
console.log(`CSS Files Tested: ${cssFiles.length} | Errors: ${cssErrors.length}`);
console.log('================================================================\n');

process.exit(jsErrors.length + htmlErrors.length + cssErrors.length > 0 ? 1 : 0);
