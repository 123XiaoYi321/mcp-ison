'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const proxyManager = require('./proxy-manager');
const { handleApi } = require('./api');

const WEB_DIR = path.join(__dirname, '..', 'web');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
};

function serveStatic(req, res) {
    const filePath = path.join(WEB_DIR, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

function createServer(port, isDebug) {
    port = port || 4000;
    isDebug = isDebug || false;
    global.__mcpisonUiPort = port;

    const server = http.createServer((req, res) => {
        // 全局 CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // 1️⃣ API 路由
        if (req.url.startsWith('/api/')) {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => handleApi(req, res, body));
            return;
        }

        // 2️⃣ 代理路由：匹配 /routeName/... 格式
        const proxyMatch = req.url.match(/^\/([^/?#]+)(\/.*)?(\?.*)?$/);
        if (proxyMatch) {
            const name = proxyMatch[1];
            if (proxyManager.hasRoute(name)) {
                proxyManager.handleProxyRequest(req, res, name, isDebug);
                return;
            }
        }

        // 3️⃣ 静态文件（前端页面）
        serveStatic(req, res);
    });

    server.listen(port, () => {
        console.log(`\n========================================`);
        console.log(`🚀 mcpison Web UI is running!`);
        console.log(`🌐 Open: http://localhost:${port}`);
        console.log(`========================================\n`);
    });

    return server;
}

module.exports = { createServer };
