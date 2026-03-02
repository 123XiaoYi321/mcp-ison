'use strict';

const proxyManager = require('./proxy-manager');

/**
 * 处理所有 /api/* 请求
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string} body - 已收集好的请求体字符串
 */
function handleApi(req, res, body) {
    res.setHeader('Content-Type', 'application/json');

    // GET /api/servers — 返回所有已注册路由
    if (req.method === 'GET' && req.url === '/api/servers') {
        res.writeHead(200);
        res.end(JSON.stringify(proxyManager.getRoutes()));
        return;
    }

    // GET /api/config — 返回可直接粘贴到 MCP Client 的 mcpServers 配置
    if (req.method === 'GET' && req.url === '/api/config') {
        const routes = proxyManager.getRoutes();
        const port = global.__mcpisonUiPort || 4000;
        const config = { mcpServers: {} };
        for (const name of Object.keys(routes)) {
            config.mcpServers[name] = {
                type: 'sse',
                url: `http://localhost:${port}/${name}/sse`
            };
        }
        res.writeHead(200);
        res.end(JSON.stringify(config, null, 2));
        return;
    }

    // POST /api/servers — 添加新代理 { name, url }
    if (req.method === 'POST' && req.url === '/api/servers') {
        try {
            const data = JSON.parse(body);
            if (!data.name || !data.url) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'name 和 url 均为必填项' }));
                return;
            }
            // 对 name 做安全过滤，只保留字母、数字、下划线、连字符
            const name = data.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
            if (!name) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '无效的 name' }));
                return;
            }
            proxyManager.addRoute(name, data.url);
            res.writeHead(201);
            res.end(JSON.stringify({ success: true, name }));
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '无效的 JSON 请求体' }));
        }
        return;
    }

    // DELETE /api/servers/:name — 删除指定代理
    const deleteMatch = req.url.match(/^\/api\/servers\/([^/]+)$/);
    if (req.method === 'DELETE' && deleteMatch) {
        const name = deleteMatch[1];
        const deleted = proxyManager.removeRoute(name);
        res.writeHead(deleted ? 200 : 404);
        res.end(JSON.stringify({ success: deleted }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
}

module.exports = { handleApi };
