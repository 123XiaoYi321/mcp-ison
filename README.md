# mcpison - MCP to ISON Transport Proxy

[![GitHub Stars](https://img.shields.io/github/stars/123XiaoYi321/mcp-ison?style=social)](https://github.com/123XiaoYi321/mcp-ison) [![npm](https://img.shields.io/npm/dm/mcpison)](https://www.npmjs.com/package/mcpison)

> ⭐ If this tool saves you tokens, please [star it on GitHub](https://github.com/123XiaoYi321/mcp-ison)!

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

`mcpison` is a transparent MCP (Model Context Protocol) transport interceptor. It converts JSON responses from MCP Servers into the lightweight **ISON format** in real-time, reducing LLM token consumption without modifying the original MCP Server code.

### Installation

```bash
npm install -g mcpison
```

---

### Usage 1: Web Management UI

A visual interface for managing proxy configurations. Start it with:

```bash
mcpison-ui
# Open http://localhost:4000
```

Use a custom port:

```bash
mcpison-ui --port 8080
```

Paste your existing `mcpServers` JSON block into the **Batch Import** tab. It will:
- Detect each server's transport type (HTTP/SSE or stdio)
- Register remote HTTP endpoints as local proxy routes
- Wrap local stdio commands with `mcpison`
- Output the complete updated configuration

Individual tabs for adding HTTP/SSE or stdio servers manually are also available.

---

### Usage 2: Remote HTTP/SSE API Proxy *(Added in v1.1.0)*

For remote MCP Servers that expose a URL, mcpison acts as a local reverse proxy.

#### Option A: Proxy a Single Endpoint

```bash
mcpison --proxy-url https://mcp.api-inference.modelscope.net/123456/mcp --port 3000
```

Update your MCP client config:

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

### Usage 3: Local stdio Proxy

For MCP Servers running locally via stdio, prepend `mcpison` to your command in the MCP client configuration:

```json
"mcpServers": {
  "my-local-server": {
    "command": "mcpison",
    "args": ["python", "/path/to/sql-server.py"]
  }
}
```

> Add `--debug` as the first item in `args` to log byte savings:
> `"args": ["--debug", "python", "/path/to/sql-server.py"]`

---

Regardless of which mode you use, all client traffic flows through mcpison. It compresses JSON in memory and returns ISON transparently, without modifying the original server code.

---

<a name="中文"></a>
## 中文

`mcpison` 是一个透明的 MCP (Model Context Protocol) 传输层拦截代理。它可以将 MCP Server 返回的 JSON 数据实时转换为轻量级的 **ISON 格式**，降低大语言模型的 Token 消耗，无需修改任何原本的 MCP Server 代码。

### 安装

```bash
npm install -g mcpison
```

---

### 用法 1：Web 管理界面

提供可视化界面管理代理配置。启动方式：

```bash
mcpison-ui
# 然后打开 http://localhost:4000
```

自定义端口：

```bash
mcpison-ui --port 8080
```

在 **批量导入** 标签页中粘贴你的 `mcpServers` JSON，系统会自动：
- 识别每个服务器的通信类型（HTTP/SSE 或 stdio）
- 将远程 HTTP 节点注册为本地代理路由
- 为本地 stdio 节点添加 `mcpison` 包装
- 输出可直接使用的完整新配置

界面上也提供 HTTP/SSE 和 stdio 的独立手动添加面板。

---

### 用法 2：远程 HTTP/SSE API 代理 *(V1.1.0 新增)*

对于只提供 URL 的远程 MCP Server，mcpison 可以作为本地反向代理。

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

### 用法 3：本地命令行工具 (stdio)

对于运行在本地、使用 stdio 通信的 MCP Server，在配置文件中把 `mcpison` 前置到命令前：

```json
"mcpServers": {
  "my-local-server": {
    "command": "mcpison",
    "args": ["python", "/path/to/sql-server.py"]
  }
}
```

> 在 `args` 首位加上 `--debug` 可在调试日志中查看节省的字节数。

---

不论是哪种方式，客户端所有流量都通过 mcpison 转发；它在内存中将 JSON 转换为 ISON 后返回给客户端，原 Server 代码无需任何改动。
