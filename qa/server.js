const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FRONTEND_DIR = path.join(__dirname, '../frontend');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4'
};

const routeMap = {
  '/': '/pages/index.html',
  '/index': '/pages/index.html',
  '/index.html': '/pages/index.html',
  '/login': '/pages/login.html',
  '/login.html': '/pages/login.html',
  '/signup': '/pages/signup.html',
  '/signup.html': '/pages/signup.html',
  '/dashboard': '/pages/dashboard.html',
  '/dashboard.html': '/pages/dashboard.html',
  '/reels': '/pages/reels.html',
  '/reels.html': '/pages/reels.html',
  '/messages': '/pages/messages.html',
  '/messages.html': '/pages/messages.html',
  '/notifications': '/pages/notifications.html',
  '/notifications.html': '/pages/notifications.html',
  '/profile': '/pages/profile.html',
  '/profile.html': '/pages/profile.html',
  '/settings': '/pages/settings.html',
  '/settings.html': '/pages/settings.html',
  '/explore': '/pages/explore.html',
  '/explore.html': '/pages/explore.html',
  '/forgot-password': '/pages/forgot-password.html',
  '/forgot-password.html': '/pages/forgot-password.html'
};

// In-memory cache to prevent EMFILE file-handle exhaustion on Windows
const cache = new Map();

function getFileContent(filePath) {
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const data = fs.readFileSync(filePath);
    cache.set(filePath, data);
    return data;
  }
  return null;
}

const server = http.createServer((req, res) => {
  let rawUrl = req.url.split('?')[0];
  let relPath = routeMap[rawUrl] || rawUrl;

  // Normalize path
  let filePath = path.join(FRONTEND_DIR, relPath);

  // If not found directly, check if it's in /pages/
  if (!fs.existsSync(filePath) && !path.extname(relPath)) {
    const candidate = path.join(FRONTEND_DIR, 'pages', relPath + '.html');
    if (fs.existsSync(candidate)) {
      filePath = candidate;
    }
  }

  const content = getFileContent(filePath);
  if (content) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Content-Length': content.length,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + rawUrl);
  }
});

server.listen(PORT, () => {
  console.log(`ConnectSphere In-Memory Resilient Server running at http://localhost:${PORT}`);
});
