#!/usr/bin/env node
const readline = require('readline');

// 一个简单的模拟 MCP Server
const rl = readline.createInterface({
    input: process.stdin,
    output: null,
    terminal: false
});

// 测试用的超大 JSON
const giantJSON = JSON.stringify({
    users: [
        { id: 1, name: "Alice", email: "alice@example.com", active: true },
        { id: 2, name: "Bob", email: "bob@example.com", active: false },
        { id: 3, name: "Charlie", email: "charlie@example.com", active: true },
        { id: 4, name: "David", email: "david@example.com", active: false },
        { id: 5, name: "Eve", email: "eve@example.com", active: true }
    ],
    status: "success",
    code: 200
});

rl.on('line', (line) => {
    if (!line.trim()) {
        return;
    }

    try {
        const req = JSON.parse(line);
        // 当收到 tools/call 请求时，返回一个巨大的 JSON 字符串作为 text content
        if (req.method === 'tools/call') {
            const response = {
                jsonrpc: "2.0",
                id: req.id,
                result: {
                    content: [
                        {
                            type: "text",
                            text: giantJSON
                        }
                    ]
                }
            };

            // 添加一些延时以模拟真实服务器处理时间
            setTimeout(() => {
                process.stdout.write(JSON.stringify(response) + '\n');
            }, 500);

        } else {
            // 其他请求随便响应
            const response = {
                jsonrpc: "2.0",
                id: req.id,
                result: { status: "ignored" }
            };
            process.stdout.write(JSON.stringify(response) + '\n');
        }
    } catch (err) {
        // 忽略错误
    }
});
