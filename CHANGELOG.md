# Changelog

All notable changes to this project will be documented in this file.

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
