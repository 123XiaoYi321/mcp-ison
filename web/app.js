'use strict';

/* ========================================
   mcpison Web UI — 前端交互逻辑
   ======================================== */

const API = '';  // 同源，无需前缀

// --------------- Tab 切换 ---------------
function switchTab(type) {
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    document.getElementById(`tab-${type}`).classList.add('active');
    document.getElementById(`tab-${type}`).setAttribute('aria-selected', 'true');
    document.getElementById(`form-${type}`).classList.remove('hidden');
}

// --------------- 提示消息 ---------------
function showMsg(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = `msg ${type}`;
    if (type === 'success') {
        setTimeout(() => { el.textContent = ''; el.className = 'msg'; }, 3000);
    }
}

// --------------- 复制到剪贴板 ---------------
async function copyText(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = '✓ 已复制';
        btn.style.color = 'var(--success)';
        setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 2000);
    } catch (e) {
        alert('复制失败，请手动复制。');
    }
}

// --------------- 加载并渲染代理列表 ---------------
async function loadProxies() {
    try {
        const res = await fetch(`${API}/api/servers`);
        const data = await res.json();
        renderProxyList(data);
    } catch (e) {
        console.error('加载代理列表失败', e);
    }
}

function renderProxyList(routes) {
    const list = document.getElementById('proxy-list');
    const count = document.getElementById('proxy-count');
    const keys = Object.keys(routes);

    count.textContent = keys.length;

    if (keys.length === 0) {
        list.innerHTML = `
      <div class="empty-state" id="empty-state">
        <span class="empty-icon">🔌</span>
        <p>暂无代理，从左侧添加第一个</p>
      </div>`;
        return;
    }

    list.innerHTML = keys.map(name => {
        const { url } = routes[name];
        return `
      <div class="proxy-card" id="card-${name}">
        <div class="proxy-dot"></div>
        <div class="proxy-info">
          <div class="proxy-name">${escHtml(name)}</div>
          <div class="proxy-url" title="${escHtml(url)}">${escHtml(url)}</div>
        </div>
        <button class="proxy-del" onclick="deleteProxy('${escHtml(name)}')" title="删除">✕</button>
      </div>`;
    }).join('');
}

// --------------- 加载并渲染输出配置 ---------------
async function loadConfig() {
    try {
        const res = await fetch(`${API}/api/config`);
        const text = await res.text();
        document.getElementById('config-output').textContent = text;
    } catch (e) {
        console.error('加载配置失败', e);
    }
}

// --------------- 添加 HTTP/SSE 代理 ---------------
async function addHttpProxy() {
    const name = document.getElementById('http-name').value.trim();
    const url = document.getElementById('http-url').value.trim();

    if (!name || !url) {
        showMsg('msg-http', '名称和 URL 均为必填项', 'error');
        return;
    }

    const btn = document.getElementById('btn-add-http');
    btn.disabled = true;
    btn.textContent = '添加中…';

    try {
        const res = await fetch(`${API}/api/servers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url })
        });
        const data = await res.json();

        if (!res.ok) {
            showMsg('msg-http', data.error || '添加失败', 'error');
            return;
        }

        showMsg('msg-http', `✓ 代理 "${data.name}" 添加成功`, 'success');
        document.getElementById('http-name').value = '';
        document.getElementById('http-url').value = '';
        await Promise.all([loadProxies(), loadConfig()]);
    } catch (e) {
        showMsg('msg-http', '网络请求失败', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">＋</span> 添加 HTTP 代理';
    }
}

// --------------- 删除代理 ---------------
async function deleteProxy(name) {
    // 乐观更新：先移除卡片
    const card = document.getElementById(`card-${name}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(8px)';
        card.style.transition = 'all 0.2s';
        setTimeout(() => card.remove(), 200);
    }

    try {
        await fetch(`${API}/api/servers/${encodeURIComponent(name)}`, { method: 'DELETE' });
        await Promise.all([loadProxies(), loadConfig()]);
    } catch (e) {
        console.error('删除失败', e);
        await loadProxies(); // 失败时重新加载
    }
}

// --------------- stdio 类型：纯前端预览 ---------------
function updateStdioPreview() {
    const name = document.getElementById('stdio-name').value.trim() || 'my-server';
    const command = document.getElementById('stdio-command').value.trim() || 'python';
    const argsRaw = document.getElementById('stdio-args').value.trim();
    const args = argsRaw ? argsRaw.split(/\s+/) : [];

    const config = {
        mcpServers: {
            [name]: {
                command: 'mcpison',
                args: [command, ...args]
            }
        }
    };

    document.getElementById('stdio-preview').textContent = JSON.stringify(config, null, 2);
}

function copyStdio() {
    const text = document.getElementById('stdio-preview').textContent;
    const btn = document.querySelector('#form-stdio .copy-btn');
    copyText(text, btn);
}

// --------------- 复制输出配置 ---------------
function copyConfig() {
    const text = document.getElementById('config-output').textContent;
    const btn = document.getElementById('btn-copy-config');
    copyText(text, btn);
}

// --------------- 工具：HTML 转义 ---------------
function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --------------- Enter 键快捷提交 ---------------
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.id === 'tab-http') {
            addHttpProxy();
        }
    }
});

// --------------- 批量导入 ---------------

/**
 * 判断单个 MCP Server 配置的类型
 * 返回 'http' | 'stdio' | 'unknown'
 */
function detectServerType(cfg) {
    // 有 url 或 baseUrl 字段（远程 HTTP/SSE 服务）
    if (cfg.url || cfg.baseUrl) return 'http';
    // 有 command 字段（stdio 模式）
    if (cfg.command) return 'stdio';
    return 'unknown';
}

async function importBatch() {
    const raw = document.getElementById('batch-json').value.trim();
    if (!raw) {
        showMsg('msg-batch', '请先粘贴 MCP 配置 JSON', 'error');
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        showMsg('msg-batch', `JSON 解析失败：${e.message}`, 'error');
        return;
    }

    // 兼容直接粘贴 mcpServers 对象 或 带外层 { mcpServers: {} } 的完整配置
    const servers = parsed.mcpServers || parsed;
    if (typeof servers !== 'object' || Array.isArray(servers)) {
        showMsg('msg-batch', '无法识别配置格式，请确认包含 mcpServers 字段或直接是服务器对象', 'error');
        return;
    }

    const names = Object.keys(servers);
    if (names.length === 0) {
        showMsg('msg-batch', '配置中没有发现任何服务器', 'error');
        return;
    }

    const btn = document.getElementById('btn-batch');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> 处理中…';
    showMsg('msg-batch', '', '');

    // 分类处理，并行注册 HTTP 代理
    const results = [];
    const stdioConfig = { mcpServers: {} };  // stdio 类型生成的新配置（纯前端）
    const batchHttpConfig = { mcpServers: {} }; // HTTP 类型前端自己构建的新配置
    const httpPromises = [];
    const port = window.location.port || 4000;

    for (const name of names) {
        const cfg = servers[name];
        const type = detectServerType(cfg);

        if (type === 'http') {
            // 保留原始键名（url 或 baseUrl）和 URL 格式（是否带 /sse 后缀）
            const originalKey = cfg.baseUrl !== undefined ? 'baseUrl' : 'url';
            const originalUrl = cfg.url || cfg.baseUrl || '';
            const urlPath = originalUrl.split('?')[0];
            const hasSse = urlPath.endsWith('/sse');

            // 为 name 做安全化处理（与后端保持一致）
            const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
            const localUrl = `http://localhost:${port}/${safeName}${hasSse ? '/sse' : ''}`;

            httpPromises.push(
                fetch(`${API}/api/servers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: safeName, url: originalUrl })
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            // 保留原始所有字段（type、headers 等），只替换 url/baseUrl 的值
                            const newEntry = {};
                            for (const k of Object.keys(cfg)) {
                                if (k !== 'url' && k !== 'baseUrl') newEntry[k] = cfg[k];
                            }
                            newEntry[originalKey] = localUrl;
                            batchHttpConfig.mcpServers[name] = newEntry;
                            results.push({
                                name, type: 'http', status: 'success',
                                desc: `已注册代理 → ${localUrl}`
                            });
                        } else {
                            results.push({ name, type: 'http', status: 'error', desc: data.error || '注册失败' });
                        }
                    })
                    .catch(e => {
                        results.push({ name, type: 'http', status: 'error', desc: e.message });
                    })
            );
        } else if (type === 'stdio') {
            // stdio：检查是否已经用了 mcpison 包装
            const alreadyWrapped = cfg.command === 'mcpison';
            if (alreadyWrapped) {
                stdioConfig.mcpServers[name] = cfg;
                results.push({
                    name, type: 'stdio', status: 'warning',
                    desc: '已使用 mcpison 包装，原样保留配置'
                });
            } else {
                const newArgs = [cfg.command, ...(cfg.args || [])];
                const newCfg = { command: 'mcpison', args: newArgs };
                if (cfg.env) newCfg.env = cfg.env;
                stdioConfig.mcpServers[name] = newCfg;
                results.push({
                    name, type: 'stdio', status: 'info',
                    desc: `已生成 mcpison 包装配置（原命令：${cfg.command}）`
                });
            }
        } else {
            results.push({
                name, type: 'unknown', status: 'error',
                desc: '无法识别类型（缺少 url 或 command 字段）'
            });
        }
    }

    // 等待所有 HTTP 注册完成
    await Promise.all(httpPromises);

    // 刷新代理列表（侧边栏展示用）
    await loadProxies();

    // 前端自己合并 HTTP + stdio 配置输出（保留原键名和 URL 格式）
    const merged = {
        mcpServers: {
            ...batchHttpConfig.mcpServers,
            ...stdioConfig.mcpServers
        }
    };
    document.getElementById('config-output').textContent = JSON.stringify(merged, null, 2);

    // 渲染结果列表
    const successCount = results.filter(r => r.status === 'success' || r.status === 'info' || r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    document.getElementById('batch-summary').textContent =
        `共 ${results.length} 个，成功 ${successCount} 个${errorCount > 0 ? `，失败 ${errorCount} 个` : ''}`;

    const ICONS = { success: '✅', info: '🔵', warning: '⚠️', error: '❌' };
    const TYPE_LABELS = { http: 'HTTP/SSE', stdio: 'stdio', unknown: '未知' };
    document.getElementById('batch-items').innerHTML = results.map(r => `
    <div class="batch-item ${r.status}">
      <span class="batch-item-icon">${ICONS[r.status]}</span>
      <div class="batch-item-info">
        <div class="batch-item-name">${escHtml(r.name)} <span style="font-weight:400;color:var(--text-muted)">[${TYPE_LABELS[r.type]}]</span></div>
        <div class="batch-item-desc">${escHtml(r.desc)}</div>
      </div>
    </div>`).join('');

    document.getElementById('batch-result').classList.remove('hidden');
    showMsg('msg-batch', `✓ 导入完成：${successCount}/${results.length} 成功`, 'success');

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⚡</span> 解析并导入';
}

// --------------- 初始化 ---------------

(async function init() {
    await Promise.all([loadProxies(), loadConfig()]);
    updateStdioPreview();
})();
