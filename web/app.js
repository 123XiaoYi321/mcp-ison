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

// --------------- 初始化 ---------------
(async function init() {
    await Promise.all([loadProxies(), loadConfig()]);
    updateStdioPreview();
})();
