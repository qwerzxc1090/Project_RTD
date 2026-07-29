const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.wav':  'audio/wav',
    '.mp3':  'audio/mpeg',
    '.ogg':  'audio/ogg',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
};

http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';

    const filePath = path.join(ROOT, decodeURIComponent(url));
    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log(`[${new Date().toISOString()}]  "${req.method} ${req.url}" Error (404): "Not found"`);
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        console.log(`[${new Date().toISOString()}]  "${req.method} ${req.url}" "${req.headers['user-agent']}"`);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log(`Game server running at http://localhost:${PORT}`);
});
