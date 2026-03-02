const { spawn } = require('child_process');

console.log("Start End-to-End Test...");

// 启动 mcpison 代理，代理指向 test/mock-server.js
const proxy = spawn('node', ['bin/mcpison.js', '--debug', 'node', 'test/mock-server.js'], {
    stdio: ['pipe', 'pipe', 'inherit'] // 将 stderr (debug信息) 直接打印到当前终端
});

let outputData = '';
proxy.stdout.on('data', (chunk) => {
    outputData += chunk.toString();
});

proxy.stdout.on('end', () => {
    // 验证截获的数据
    console.log("\n--- Received Output from Proxy ---");
    console.log(outputData);

    try {
        const res = JSON.parse(outputData);
        const text = res.result.content[0].text;

        if (text.includes('table.users')) {
            console.log("\n✅ Test Passed: JSON was successfully converted to ISON format.");
        } else {
            console.error("\n❌ Test Failed: text does not look like ISON format.");
        }
    } catch (e) {
        console.error("\n❌ Test Failed: Could not parse response JSON.");
    }
});

proxy.on('error', (err) => {
    console.error("Proxy start failed:", err);
});

// 发送一个 tools/call 模拟请求
const mockRequest = {
    jsonrpc: "2.0",
    id: 1001,
    method: "tools/call",
    params: {
        name: "get_users",
        arguments: {}
    }
};

console.log("Sending mock tools/call request...");
proxy.stdin.write(JSON.stringify(mockRequest) + '\n');

// 稍后结束输入
setTimeout(() => {
    proxy.stdin.end();
}, 2000);
