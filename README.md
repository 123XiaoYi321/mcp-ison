# mcpison - MCP to ISON Transport Proxy

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

`mcpison` is a minimal and transparent MCP (Model Context Protocol) transport interceptor. It converts the heavy JSON responses from existing MCP Servers into the ultra-lightweight **ISON format** in real-time, dramatically reducing LLM token consumption.

**The best part: no modifications to your original MCP Server code are needed.**

### Installation

```bash
npm install -g mcpison
```

---

### Usage 1: Local stdio Proxy

For traditional MCP Servers running locally via stdio (e.g., Python/Node scripts), simply prepend `mcpison` to your command in the MCP client configuration:

```json
"mcpServers": {
  "my-local-server": {
    "command": "mcpison",
    "args": ["python", "/path/to/sql-server.py"]
  }
}
```

> Add `--debug` as the first item in `args` to see byte savings in your client's debug logs:
> `"args": ["--debug", "python", "/path/to/sql-server.py"]`

---

### Usage 2: Remote HTTP/SSE API Proxy *(Added in v1.1.0)*

For remote MCP Servers that only expose a URL, **mcpison acts as a reverse-proxy micro-gateway**.

#### Option A: Proxy a Single Endpoint

```bash
mcpison --proxy-url https://mcp.api-inference.modelscope.net/123456/mcp --port 3000
```

Then update your MCP client config:

```json
"mcpServers": {
  "my-remote-server": {
    "type": "sse",
    "url": "http://localhost:3000/sse"
  }
}
```

#### Option B: Proxy Multiple Endpoints on One Port *(Added in v1.1.x)*

Create a `mcp-routes.json` file:

```json
{
  "/modelscope": "https://mcp.api-inference.modelscope.net/123456/mcp",
  "/weather": "https://weather-mcp.example.com/api"
}
```

Start with the config:

```bash
mcpison --config mcp-routes.json --port 3000
```

```json
"mcpServers": {
  "my-modelscope": { "type": "sse", "url": "http://localhost:3000/modelscope/sse" },
  "my-weather":    { "type": "sse", "url": "http://localhost:3000/weather/sse" }
}
```

---

### Usage 3: Web Management UI *(Added in v1.3.0)*

A visual management interface that lets you paste your existing MCP config and automatically generates the optimized proxy config — no manual CLI needed.

```bash
mcpison-ui
# Then open http://localhost:4000
```

Use a custom port:

```bash
mcpison-ui --port 8080
```

**Features:**
- **HTTP/SSE tab**: Add remote MCP endpoints — they're registered as proxy routes dynamically
- **stdio tab**: Fill in your command/args — the wrapped `mcpison` config is generated instantly
- **Batch Import tab** *(Added in v1.3.1)*: Paste an entire `mcpServers` JSON block. The UI automatically:
  - Detects each server's type (HTTP/SSE or stdio)
  - Registers HTTP endpoints as proxy routes
  - Wraps stdio commands with `mcpison`
  - Outputs the complete new config ready to copy-paste

---

Regardless of which mode you use, all client traffic flows through mcpison. It compresses the heavy JSON in memory and transparently returns ISON — all without touching the original server code.

🚀 **Enjoy Token Freedom!**

---

<a name="中文"></a>
## 中文

`mcpison` 是一个极简且透明的 MCP (Model Context Protocol) 传输层拦截代理。它可以将现有的 MCP Server 返回的庞大 JSON 数据实时转换为极端轻量级的 **ISON 格式**，大幅节约大语言模型的 Token。

**最重要的特点是：无需修改任何原本的 MCP Server 代码。**

### 安装

```bash
npm install -g mcpison
```

---

### 用法 1：本地命令行工具 (stdio)

对于传统的运行在本地、使用 stdio 通信的 MCP Server，只需在配置文件中把 `mcpison` 垫在命令前：

```json
"mcpServers": {
  "my-local-server": {
    "command": "mcpison",
    "args": ["python", "/path/to/sql-server.py"]
  }
}
```

> 在 `args` 首位加上 `--debug` 可在客户端调试日志中看到节省了多少字节。

---

### 用法 2：远程 HTTP/SSE API 代理 *(V1.1.0 新增)*

对于只提供 URL 的远程 MCP Server，**mcpison 可以化身为反向代理微型网关**。

#### 方式 A：单独代理一个节点

```bash
mcpison --proxy-url https://mcp.api-inference.modelscope.net/123456/mcp --port 3000
```

```json
"mcpServers": {
  "my-remote-server": {
    "type": "sse",
    "url": "http://localhost:3000/sse"
  }
}
```

#### 方式 B：单端口代理多个节点 *(V1.1.x 新增)*

创建 `mcp-routes.json`：

```json
{
  "/modelscope": "https://mcp.api-inference.modelscope.net/123456/mcp",
  "/weather": "https://weather-mcp.example.com/api"
}
```

```bash
mcpison --config mcp-routes.json --port 3000
```

```json
"mcpServers": {
  "my-modelscope": { "type": "sse", "url": "http://localhost:3000/modelscope/sse" },
  "my-weather":    { "type": "sse", "url": "http://localhost:3000/weather/sse" }
}
```

---

### 用法 3：Web 管理界面 *(V1.3.0 新增)*

可视化管理界面，粘贴你现有的 MCP 配置，自动生成优化后的代理配置，无需手动敲命令。

```bash
mcpison-ui
# 然后打开 http://localhost:4000
```

自定义端口：

```bash
mcpison-ui --port 8080
```

**功能列表：**
- **HTTP/SSE 页**：输入远程 MCP URL，动态注册到代理网关
- **stdio 页**：填入命令和参数，自动生成包了 `mcpison` 的新配置
- **批量导入页** *(V1.3.1 新增)*：粘贴整段 `mcpServers` JSON，系统自动：
  - 识别每个服务器的类型（HTTP/SSE 或 stdio）
  - 将 HTTP 节点注册为代理路由
  - 将 stdio 节点包裹上 `mcpison`
  - 汇总输出完整的新配置，可直接复制粘贴

---

不论是哪一种方式，客户端所有的流量都会打到 mcpison 监听的接口；它会无缝替您向真正的远端 API 索要数据，在内存压缩巨大的 JSON 后再透明返回，而这一切完全不用修改原 Server 的代码。

🚀 **Enjoy Token Freedom!**
