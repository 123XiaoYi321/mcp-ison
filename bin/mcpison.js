#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');
const { jsonToISON } = require('ison-parser');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

// 提取专属参数并保留传递给子进程的参数
const args = process.argv.slice(2);
let isDebug = false;
let proxyUrl = null;
let configFile = null;
let proxyPort = 3000; // 默认网关端口

const spawnArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--debug') {
    isDebug = true;
  } else if (args[i] === '--proxy-url') {
    proxyUrl = args[++i];
  } else if (args[i] === '--config') {
    configFile = args[++i];
  } else if (args[i] === '--port') {
    proxyPort = parseInt(args[++i], 10);
  } else {
    spawnArgs.push(args[i]);
  }
}

// ============== 模式1：HTTP 网络请求反向代理模式 ==============
if (proxyUrl || configFile) {
  let proxyRoutes = {};

  if (configFile) {
    try {
      proxyRoutes = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (err) {
      console.error(`Failed to read config file: ${err.message}`);
      process.exit(1);
    }
  }

  const proxyServer = http.createServer((clientReq, clientRes) => {
    // 设置 CORS 允许跨域（部分客户端可能需要）
    clientRes.setHeader('Access-Control-Allow-Origin', '*');
    clientRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    clientRes.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (clientReq.method === 'OPTIONS') {
      clientRes.writeHead(200);
      clientRes.end();
      return;
    }

    let targetParsed = null;
    let rewritePath = clientReq.url;

    if (configFile) {
      let longestMatch = '';
      for (const prefix in proxyRoutes) {
        if (clientReq.url.startsWith(prefix) && prefix.length > longestMatch.length) {
          longestMatch = prefix;
        }
      }

      if (longestMatch) {
        const baseStr = proxyRoutes[longestMatch];
        let remainingPath = clientReq.url.substring(longestMatch.length);
        if (!remainingPath.startsWith('/')) remainingPath = '/' + remainingPath;

        targetParsed = url.parse(baseStr);
        let basePath = targetParsed.pathname === '/' ? '' : targetParsed.pathname;
        let finalPath = basePath + remainingPath;
        rewritePath = finalPath.replace(/\/\//g, '/');
      } else {
        clientRes.writeHead(404);
        clientRes.end('No proxy route found for this path\n');
        return;
      }
    } else {
      targetParsed = url.parse(proxyUrl);
    }

    const options = {
      hostname: targetParsed.hostname,
      port: targetParsed.port || (targetParsed.protocol === 'https:' ? 443 : 80),
      path: rewritePath,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: targetParsed.host }
    };

    const protocolResolver = targetParsed.protocol === 'https:' ? https : http;

    const proxyReq = protocolResolver.request(options, (proxyRes) => {
      // 透传目标服务器的响应头
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

      // 如果不是事件流 (SSE)，直接硬管道透传，不作任何处理
      if (!proxyRes.headers['content-type'] || !proxyRes.headers['content-type'].includes('event-stream')) {
        proxyRes.pipe(clientRes);
        return;
      }

      // 是 SSE 事件流，启动拦截过滤
      let buffer = '';

      proxyRes.on('data', (chunk) => {
        buffer += chunk.toString();
        let lines = buffer.split('\n');
        buffer = lines.pop(); // 保留最后一个不完整的行

        for (let line of lines) {
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
              // 判断是否属于类似 tools/call 的 response 封包
              if (parsed && parsed.result && parsed.result.content && Array.isArray(parsed.result.content)) {
                let tokenSaved = 0;
                let origLength = 0;
                let newLength = 0;

                for (let i = 0; i < parsed.result.content.length; i++) {
                  const item = parsed.result.content[i];
                  if (item.type === 'text' && typeof item.text === 'string') {
                    try {
                      JSON.parse(item.text); // Validate inner json
                      const isonStr = jsonToISON(item.text);
                      if (isDebug) {
                        origLength += item.text.length;
                        newLength += isonStr.length;
                        tokenSaved += (item.text.length - isonStr.length);
                      }
                      item.text = isonStr;
                    } catch (e) { } // Ignore non-json
                  }
                }

                if (isDebug && tokenSaved > 0) {
                  console.error(`[mcpison DEBUG Proxy] Optimized HTTP Stream Response: ${origLength} bytes -> ${newLength} bytes (Saved ~${tokenSaved} bytes)`);
                }

                clientRes.write(`data: ${JSON.stringify(parsed)}\n`);
                continue;
              }
            } catch (err) { }
          }
          clientRes.write(line + '\n');
        }
      });

      proxyRes.on('end', () => {
        if (buffer) clientRes.write(buffer);
        clientRes.end();
      });
    });

    // 将客户端的请求体（比如POST的参数）无缝流向远端
    clientReq.pipe(proxyReq);

    proxyReq.on('error', (e) => {
      console.error('[mcpison Proxy Error]', e.message);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502);
      }
      clientRes.end('Bad Gateway');
    });
  });

  proxyServer.listen(proxyPort, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 mcpison HTTP Proxy Gateway is running! (Native Engine)`);
    if (configFile) {
      console.log(`🎯 Config Rules: ${configFile}`);
      Object.keys(proxyRoutes).forEach(p => {
        console.log(`   - ${p} -> ${proxyRoutes[p]}`);
      });
    } else {
      console.log(`🎯 Target: ${proxyUrl}`);
    }
    console.log(`✨ Local MCP Endpoint: http://localhost:${proxyPort}`);
    console.log(`\n💡 Please update your MCP Client config to point to this local server:`);
    console.log(`{`);
    console.log(`  "mcpServers": {`);
    console.log(`    "your-mcp": {`);
    console.log(`      "type": "sse",`);
    if (configFile) {
      const samplePrefix = Object.keys(proxyRoutes)[0] || '/example';
      console.log(`      "url": "http://localhost:${proxyPort}${samplePrefix}/sse"`);
    } else {
      console.log(`      "url": "http://localhost:${proxyPort}/sse"`);
    }
    console.log(`    }`);
    console.log(`  }`);
    console.log(`}`);
    console.log(`======================================================\n`);
  });

  return; // 结束，不执行 stdio 逻辑
}

// ============== 模式2：传统的本地 stdio (子进程) 拦截模式 ==============

if (spawnArgs.length === 0) {
  console.error("Usage: mcpison [--debug] <command> [args...]");
  console.error("   or: mcpison [--debug] --proxy-url <URL> [--port <PORT>]");
  console.error("   or: mcpison [--debug] --config <routes.json> [--port <PORT>]");
  process.exit(1);
}

const command = spawnArgs[0];
const commandArgs = spawnArgs.slice(1);

// 启动底层 MCP Server 子进程
const child = spawn(command, commandArgs, {
  stdio: ['pipe', 'pipe', 'inherit'] // 将 stderr 直接透传给父进程
});

child.on('error', (err) => {
  console.error(`Failed to start child process: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  process.exit(code || Number(Boolean(signal)));
});

// 使用 readline 逐行处理 stdin (Client -> Proxy -> Server)
const rlStdin = readline.createInterface({
  input: process.stdin,
  output: null,
  terminal: false
});

// 记录所有 Client 发送过来的 "tools/call" 请求的 ID
// 使用 Map 存储 { id -> timeoutHandle }，防止服务端无响应导致内存泄漏
const PENDING_TIMEOUT_MS = 60_000; // 60 秒后自动清理无响应的 id
const pendingCallToolIds = new Map();

rlStdin.on('line', (line) => {
  if (!line.trim()) return;

  try {
    const req = JSON.parse(line);
    // 拦截识别 tools/call，注册超时清理
    if (req.method === 'tools/call' && req.id !== undefined) {
      const timer = setTimeout(() => {
        pendingCallToolIds.delete(req.id);
      }, PENDING_TIMEOUT_MS);
      if (timer.unref) timer.unref(); // 不阻止进程正常退出
      pendingCallToolIds.set(req.id, timer);
    }
  } catch (err) {
  }

  // 将请求原样转发给子进程
  child.stdin.write(line + '\n');
});

rlStdin.on('close', () => {
  child.stdin.end();
});

// 使用 readline 逐行处理 stdout (Server -> Proxy -> Client)
const rlStdout = readline.createInterface({
  input: child.stdout,
  output: null,
  terminal: false
});

rlStdout.on('line', (line) => {
  if (!line.trim()) {
    process.stdout.write(line + '\n');
    return;
  }

  try {
    const res = JSON.parse(line);

    if (res.id !== undefined && res.result && res.result.content && Array.isArray(res.result.content)) {
      if (pendingCallToolIds.has(res.id)) {
        // 清除超时定时器，避免内存泄漏
        clearTimeout(pendingCallToolIds.get(res.id));
        pendingCallToolIds.delete(res.id);

        let tokenSaved = 0;
        let origLength = 0;
        let newLength = 0;

        for (let i = 0; i < res.result.content.length; i++) {
          const item = res.result.content[i];
          if (item.type === 'text' && typeof item.text === 'string') {
            try {
              JSON.parse(item.text);
              const isonStr = jsonToISON(item.text);

              if (isDebug) {
                origLength += item.text.length;
                newLength += isonStr.length;
                tokenSaved += (item.text.length - isonStr.length);
              }
              item.text = isonStr;
            } catch (innerErr) {
            }
          }
        }

        if (isDebug && tokenSaved > 0) {
          console.error(`[mcpison DEBUG] Request ID ${res.id} Optimized: ${origLength} bytes -> ${newLength} bytes (Saved ~${tokenSaved} bytes)`);
        }

        process.stdout.write(JSON.stringify(res) + '\n');
        return;
      }
    }

    process.stdout.write(line + '\n');

  } catch (err) {
    process.stdout.write(line + '\n');
  }
});
