'use strict';

const http = require('http');
const https = require('https');
const urlModule = require('url');
const { jsonToISON } = require('ison-parser');

// 路由表：Map<name, { url: string, createdAt: number }>
const routes = new Map();

function addRoute(name, targetUrl) {
    routes.set(name, { url: targetUrl, createdAt: Date.now() });
}

function removeRoute(name) {
    return routes.delete(name);
}

function getRoutes() {
    const result = {};
    for (const [name, info] of routes) {
        result[name] = info;
    }
    return result;
}

function hasRoute(name) {
    return routes.has(name);
}

/**
 * 处理代理请求——拦截 SSE 并将 tools/call 响应中的 JSON 转为 ISON
 * @param {http.IncomingMessage} clientReq
 * @param {http.ServerResponse} clientRes
 * @param {string} name - 路由名称（不含斜杠）
 * @param {boolean} isDebug
 */
function handleProxyRequest(clientReq, clientRes, name, isDebug) {
    const routeInfo = routes.get(name);
    if (!routeInfo) {
        clientRes.writeHead(404);
        clientRes.end(`No proxy route found for: /${name}\n`);
        return;
    }

    const targetParsed = urlModule.parse(routeInfo.url);

    // 去掉路由前缀后的剩余路径
    const prefixLen = `/${name}`.length;
    let remainingPath = clientReq.url.substring(prefixLen) || '/';
    if (!remainingPath.startsWith('/')) remainingPath = '/' + remainingPath;

    const basePath = targetParsed.pathname === '/' ? '' : (targetParsed.pathname || '');
    const finalPath = (basePath + remainingPath).replace(/\/\//g, '/');

    const options = {
        hostname: targetParsed.hostname,
        port: targetParsed.port || (targetParsed.protocol === 'https:' ? 443 : 80),
        path: finalPath,
        method: clientReq.method,
        headers: { ...clientReq.headers, host: targetParsed.host }
    };

    const resolver = targetParsed.protocol === 'https:' ? https : http;

    const proxyReq = resolver.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

        // 非 SSE：直接透传，不做任何处理
        const ct = proxyRes.headers['content-type'] || '';
        if (!ct.includes('event-stream')) {
            proxyRes.pipe(clientRes);
            return;
        }

        // SSE：逐行拦截，匹配 tools/call 响应并转换 ISON
        let buffer = '';
        proxyRes.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // 保留末尾不完整行

            for (const line of lines) {
                if (!line.trim()) {
                    clientRes.write('\n');
                    continue;
                }
                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6);
                    if (dataStr.trim() === '[DONE]') {
                        clientRes.write(line + '\n');
                        continue;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed && parsed.result && Array.isArray(parsed.result.content)) {
                            let origLen = 0, newLen = 0;
                            for (const item of parsed.result.content) {
                                if (item.type === 'text' && typeof item.text === 'string') {
                                    try {
                                        JSON.parse(item.text); // 验证是否为合法 JSON
                                        if (isDebug) origLen += item.text.length;
                                        item.text = jsonToISON(item.text);
                                        if (isDebug) newLen += item.text.length;
                                    } catch (e) { /* 非 JSON，跳过 */ }
                                }
                            }
                            if (isDebug && origLen > newLen) {
                                console.error(`[mcpison-ui] Optimized: ${origLen} → ${newLen} bytes (Saved ~${origLen - newLen})`);
                            }
                            clientRes.write(`data: ${JSON.stringify(parsed)}\n`);
                            continue;
                        }
                    } catch (e) { /* JSON 解析失败，原样透传 */ }
                }
                clientRes.write(line + '\n');
            }
        });

        proxyRes.on('end', () => {
            if (buffer) clientRes.write(buffer);
            clientRes.end();
        });
    });

    clientReq.pipe(proxyReq);

    proxyReq.on('error', (e) => {
        console.error('[mcpison-ui Proxy Error]', e.message);
        if (!clientRes.headersSent) clientRes.writeHead(502);
        clientRes.end('Bad Gateway');
    });
}

module.exports = { addRoute, removeRoute, getRoutes, hasRoute, handleProxyRequest };
