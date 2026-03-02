# mcpison - MCP to ISON Transport Proxy

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

`mcpison` is a minimal and transparent MCP (Model Context Protocol) transport interceptor. It converts the heavy JSON responses from existing MCP Servers (e.g., `tools/call` with large structured data) into the ultra-lightweight **ISON format** in real-time, dramatically reducing LLM token consumption.

**The best part: no modifications to your original MCP Server code are needed.**

### Installation

```bash
npm install -g mcpison
```

### Usage 1: Local stdio Proxy

For traditional MCP Servers running locally via stdio (e.g., Python/Node scripts), simply prepend `mcpison` to your command in the MCP client configuration (e.g., Claude Desktop's `claude_desktop_config.json`, Cursor, or Windsurf), and move your original command into the first position of `args`:

#### Modified Configuration Example

```json
"mcpServers": {
  "my-local-server": {
    "command": "mcpison",
    "args": ["python", "/path/to/sql-server.py"]
  }
}
```

> Want to see how many bytes are saved? Add `--debug` as the first item in `args`:
> `"args": ["--debug", "python", "/path/to/sql-server.py"]`
> You'll see output like `Optimized: 395 bytes -> 240 bytes (Saved ~155 bytes)` in your client's debug logs.

---

### Usage 2: Remote HTTP/SSE API Proxy *(Added in v1.1.0)*

For `type: "streamable_http"` or other remote MCP Servers that only expose a URL (e.g., official or third-party SaaS MCP endpoints), you can't launch them locally. Instead, **mcpison acts as a reverse-proxy micro-gateway listening on a local port.**

#### Option A: Proxy a Single Endpoint

Run the following command in any terminal:

```bash
mcpison --proxy-url https://mcp.api-inference.modelscope.net/123456/mcp --port 3000
```

This starts a proxy server on local port 3000. Then update your MCP client config to point to it:

```json
"mcpServers": {
  "my-remote-server": {
    "type": "sse",
    "url": "http://localhost:3000/sse"
  }
}
```

#### Option B: Proxy Multiple Endpoints on One Port *(Added in v1.1.x)*

As you add more remote endpoints, occupying a separate port for each becomes unwieldy. mcpison supports a routing config gateway mode.

First, create a `mcp-routes.json` file (name is flexible):

```json
{
  "/modelscope": "https://mcp.api-inference.modelscope.net/123456/mcp",
  "/weather": "https://weather-mcp.example.com/api"
}
```

Then start mcpison with the config file:

```bash
mcpison --config mcp-routes.json --port 3000
```

Now all your tools can share the same port 3000 by appending their route prefix:

```json
"mcpServers": {
  "my-modelscope": {
    "type": "sse",
    "url": "http://localhost:3000/modelscope/sse"
  },
  "my-weather": {
    "type": "sse",
    "url": "http://localhost:3000/weather/sse"
  }
}
```

---

Regardless of which mode you use, all client traffic flows through mcpison. It seamlessly fetches data from the real remote API, compresses the heavy JSON in memory, and transparently returns it — all without touching the original server code.

🚀 **Enjoy Token Freedom!**

---

<a name="中文"></a>
## 中文

`mcpison` 是一个极简且透明的 MCP (Model Context Protocol) 传输层拦截代理。它可以将现有的 MCP Server（如返回包含庞大 JSON 数据的 `tools/call` 强结构）实时转换为极端轻量级的 **ISON 格式**，大幅节约大语言模型的 Token。

**最重要的特点是：无需修改任何原本的 MCP Server 代码。**

### 安装

```bash
npm install -g mcpison
```

### 用法 1：本地命令行工具 (stdio)

对于传统的运行在您电脑本地、使用 stdio 进行通信的 MCP Server（如 Python/Node 脚本），只需在你使用的 MCP Client 配置文件（例如 Claude Desktop 的 `claude_desktop_config.json` 或 Cursor、Windsurf 中），在现有的命令前垫加一层 `mcpison`，并把你原来的命令平移至 `args` 的第一位：

#### 修改后配置示例

```json
"mcpServers": {
  "my-local-server": {
    "command": "mcpison",
    "args": ["python", "/path/to/sql-server.py"]
  }
}
```

> 想要看节约了多少字符？在 `args` 首位加上 `--debug` 标志：
> `"args": ["--debug", "python", "/path/to/sql-server.py"]`
> 即可在您的客户端内部调试日志看到形如 `Optimized: 395 bytes -> 240 bytes (Saved ~155 bytes)` 的打印。

---

### 用法 2：远程 HTTP/SSE API 代理 *(V1.1.0 新增)*

对于 `type: "streamable_http"` 或其他部署在远端只提供一个 URL 的 MCP Server（例如官方和第三方提供的 SaaS MCP 节点），你无法使用本地命令行启动。

此时，**mcpison 可以化身为一个监听端口的反向代理微型网关！**

#### 方式 A：单独代理一个节点

在操作系统的随便一个终端/后台执行以下命令：

```bash
mcpison --proxy-url https://mcp.api-inference.modelscope.net/123456/mcp --port 3000
```

这将在本地的 3000 端口启动一个代理服务器。然后，您只需**回到 MCP Client 的配置**，把那个工具指向 mcpison 为你转接好的本地服务：

```json
"mcpServers": {
  "my-remote-server": {
    "type": "sse",
    "url": "http://localhost:3000/sse"
  }
}
```

#### 方式 B：单端口代理多个节点 *(V1.1.x 新增)*

随着您使用的远程节点增多，每一个节点都占用一个本地端口会非常臃肿。因此 mcpison 支持了基于路由配置的网关模式。

首先，创建一个 `mcp-routes.json`（名字随意）文件：

```json
{
  "/modelscope": "https://mcp.api-inference.modelscope.net/123456/mcp",
  "/weather": "https://weather-mcp.example.com/api"
}
```

然后在终端以加载配置的模式启动：

```bash
mcpison --config mcp-routes.json --port 3000
```

现在，您只需分别**在本地地址后拼接您刚刚设置的前缀**，就能在客户端完全复用这同一个 3000 端口进行多路并发请求了：

```json
"mcpServers": {
  "my-modelscope": {
    "type": "sse",
    "url": "http://localhost:3000/modelscope/sse"
  },
  "my-weather": {
    "type": "sse",
    "url": "http://localhost:3000/weather/sse"
  }
}
```

---

不论是哪一种方式，客户端所有的流量都会打到 mcpison 监听的接口；它会无缝替您向真正的远端 API 索要数据，在内存截断并压缩巨大的 JSON 后再透明返回，而这一切完全不用修改原 Server 的代码。

🚀 **Enjoy Token Freedom!**
