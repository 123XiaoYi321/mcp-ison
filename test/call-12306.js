const http = require('http');

console.log('====== 准备直调模拟 MCP Client 调用 12306 MCP 服务 ======');

// 模拟 MCP Client 向本地 3344 网关发起的标准协议
const requestData = JSON.stringify({
    jsonrpc: "2.0",
    id: "test-req-10086",
    method: "tools/call",
    params: {
        name: "query_train_info",
        arguments: {
            from_station: "北京",
            to_station: "上海",
            date: "2024-03-01"  // 随便一个时间，只要远端能返回任意余票查询的 JSON 就行
        }
    }
});

const options = {
    hostname: 'localhost',
    port: 3344,
    path: '/7498f7116f904e/mcp',
    method: 'POST',  // Modelscope 的 SSE HTTP MCP server 是通过 POST 触发 tools/call 的
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
    }
};

const req = http.request(options, (res) => {
    console.log(`[客户端] 网关返回状态码: ${res.statusCode}`);
    console.log(`[客户端] Header:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk.toString();
    });

    res.on('end', () => {
        console.log(`\n================= 获取并处理完毕 =================`);
        console.log(`[客户端] 收到了来自 12306-mcp 的脱水响应包 (大小: ${data.length} bytes):`);
        // 打印前 500 个字符以供验证
        console.log(data.substring(0, 500) + '...\n\n(由于原包非常庞大，仅截断展示)');
    });
});

req.on('error', (e) => {
    console.error(`[请求错误]: ${e.message}`);
});

req.write(requestData);
req.end();
