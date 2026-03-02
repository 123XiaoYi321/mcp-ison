# Changelog

All notable changes to this project will be documented in this file.

---

## [1.3.5] - 2026-03-02

### Changed
- `README.md` rewritten to remove promotional language; Web UI usage moved to first position.

---

## [1.3.4] - 2026-03-02

### Fixed
- **Batch Import** now preserves ALL original fields (`type`, `headers`, etc.) when generating the new proxy config — only `url`/`baseUrl` values are replaced with the local proxy address. This prevents `streamable_http` from being incorrectly changed to `sse`.

---

## [1.3.3] - 2026-03-02

### Fixed
- **Batch Import** now preserves the original key name (`url` or `baseUrl`) and URL format (with or without `/sse` suffix) when generating the new proxy config.

### Changed
- `detectServerType` now recognises both `url` and `baseUrl` fields as HTTP/SSE type.

---

## [1.3.2] - 2026-03-02

### Changed
- Make **Batch Import** the default active tab in Web UI.
- Highlight Batch Import as the recommended primary usage in `README.md`.

---

## [1.3.1] - 2026-03-02

### Added
- **Batch Import** in Web UI: paste an entire `mcpServers` JSON block, the UI auto-detects each server's type, registers HTTP/SSE endpoints as proxy routes, and wraps stdio commands with `mcpison`.

---

## [1.3.0] - 2026-03-02

### Added
- **`mcpison-ui` command**: starts a Web management interface on `http://localhost:4000` (supports `--port`).
- **HTTP/SSE proxy management**: add/remove remote MCP endpoints dynamically via UI — routes registered in-memory without restart.
- **stdio config generator**: fill in command + args, get the `mcpison`-wrapped config instantly.
- **One-click copy**: generated `mcpServers` JSON ready to paste into any MCP client.

---


## [1.2.3] - 2026-03-02

### Fixed
- **Memory leak**: `pendingCallToolIds` now auto-cleans entries after a 60s timeout to prevent unbounded growth when MCP servers fail to respond.

### Added
- `LICENSE` file (MIT) added to repository.
- `CHANGELOG.md` introduced to track version history.

---

## [1.2.2] - 2026-03-02

### Added
- `repository`, `homepage`, and `bugs` fields added to `package.json` — the npm package page now links directly to the GitHub repository.

---

## [1.2.1] - 2026-03-02

### Changed
- `README.md` rewritten as a **bilingual (English / 中文)** document with anchor-link navigation.

---

## [1.2.0] - 2026-02-27

### Added
- **Multi-route gateway mode** (`--config mcp-routes.json`): proxy multiple remote MCP endpoints on a single local port using path-based routing.

---

## [1.1.0] - 2026-02-27

### Added
- **HTTP/SSE reverse proxy mode** (`--proxy-url`): forward SSE-based remote MCP endpoints through a local port, with on-the-fly JSON-to-ISON conversion.

---

## [1.0.0] - 2026-02-27

### Added
- Initial release.
- **stdio interceptor mode**: transparently wraps any local MCP server subprocess and converts `tools/call` JSON responses to ISON format.
- `--debug` flag for byte-savings logging.
