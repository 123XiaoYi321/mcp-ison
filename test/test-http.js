const http = require('http');
const { spawn } = require('child_process');

console.log('====== 准备测试 mcpison HTTP Proxy 模式 ======');

const mockRemoteServer = http.createServer((req, res) => {
    console.log(`[远程假服务端] 收到请求: ${req.url}`);
    res.writeHead(200, {
        'Content-Type': 'text/event-stream charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const fakeHugeJson = {
        method: "tools/call",
        id: 999,
        result: {
            content: [{ type: "text", text: JSON.stringify({ data: Array.from({ length: 50 }, (_, i) => ({ id: i, v: "1111" })) }) }]
        }
    };

    res.write(`data: ${JSON.stringify(fakeHugeJson)}\n\n`);
    setTimeout(() => res.end(), 1000);
});

mockRemoteServer.listen(8081, () => {
    console.log('[代理网关] 正在启动 mcpison...');
    const proxyProcess = spawn('node', [
        './bin/mcpison.js',
        '--debug',
        '--proxy-url', 'http://localhost:8081',
        '--port', '3344'
    ]);

    proxyProcess.stdout.on('data', d => process.stdout.write('[PROXY STDOUT] ' + d));
    proxyProcess.stderr.on('data', d => process.stdout.write('[PROXY STDERR] ' + d));

    setTimeout(() => {
        console.log('\n[测试客户端] 从本机网关请求数据 (http://localhost:3344/sse)...');
        http.get('http://localhost:3344/sse', (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk.toString(); });
            res.on('end', () => {
                console.log(`\n[测试客户端] 成功收到! 包含 ISON "$type"? ${data.includes('$type')}`);
                mockRemoteServer.close();
                proxyProcess.kill();
                process.exit(0);
            });
        }).on('error', (err) => {
            console.error('[测试请求失败]', err);
        });
    }, 1000);
});
