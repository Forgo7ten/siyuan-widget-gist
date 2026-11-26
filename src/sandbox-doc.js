function escapeHtmlAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * 构建内层 sandbox iframe 的 srcdoc。
 * 在官方 Gist 脚本后注入参考 Hexo 主题与 GitHub Primer 定制的浅色/深色样式层及高度探针。
 */
export function buildGistSrcdoc(validatedUrl, seq, themeMode = 'light') {
    const safeSrc = escapeHtmlAttr(validatedUrl);
    const safeSeq = Math.trunc(seq) || 0;
    const safeTheme = themeMode === 'dark' ? 'dark' : 'light';

    return `<!doctype html>
<html data-theme="${safeTheme}">
<head>
<meta charset="utf-8">
<base target="_blank" rel="noopener noreferrer">
<style>
:root {
    color-scheme: light;
}
:root[data-theme="dark"] {
    color-scheme: dark;
}
html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    background: transparent;
    overflow: hidden;
}
html[data-theme="dark"],
html[data-theme="dark"] body {
    background: #1e1e1e;
}
#gist-root {
    width: 100%;
    overflow: hidden;
}
</style>
</head>
<body>
<div id="gist-root">
<script>
window.__gistSeq = ${safeSeq};
window.__gistScriptFailed = false;
window.__notifyGistError = function () {
    if (window.__gistScriptFailed) return;
    window.__gistScriptFailed = true;
    parent.postMessage({ type: 'gist:error', seq: window.__gistSeq }, '*');
};
<\/script>
<script id="gist-embed-script" src="${safeSrc}" onerror="window.__notifyGistError()"><\/script>
<style id="siyuan-gist-custom-style">
/* 通用卡片、行号、滚动条与底栏样式精修（参照 Hexo NexT / Fluid Gist 定制规范） */
#gist-root .gist {
    width: 100% !important;
    color: #1f2328 !important;
}

#gist-root .gist .gist-file {
    margin: 0 !important;
    border: 1px solid #d0d7de !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    background-color: #ffffff !important;
    box-shadow: 0 1px 2px rgba(31, 35, 40, 0.04) !important;
}

#gist-root .gist .gist-file + .gist-file {
    margin-top: 10px !important;
}

#gist-root .gist .file {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}

#gist-root .gist .gist-data {
    background-color: #ffffff !important;
    border-bottom: 1px solid #e6ebf1 !important;
    border-radius: 8px 8px 0 0 !important;
    overflow-x: auto !important;
}

#gist-root .gist .blob-wrapper {
    overflow-x: auto !important;
}

#gist-root .gist .gist-data::-webkit-scrollbar,
#gist-root .gist .blob-wrapper::-webkit-scrollbar {
    height: 7px;
    width: 7px;
}

#gist-root .gist .gist-data::-webkit-scrollbar-thumb,
#gist-root .gist .blob-wrapper::-webkit-scrollbar-thumb {
    background: rgba(140, 149, 159, 0.4);
    border-radius: 4px;
}

#gist-root .gist .gist-data::-webkit-scrollbar-thumb:hover,
#gist-root .gist .blob-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(140, 149, 159, 0.65);
}

#gist-root .gist .highlight {
    background: transparent !important;
    font-family: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace !important;
    font-size: 13px !important;
    line-height: 1.55 !important;
    tab-size: 4 !important;
}

#gist-root .gist .blob-wrapper table {
    border-collapse: collapse !important;
    width: 100%;
}

#gist-root .gist .blob-wrapper tr:first-child td {
    padding-top: 8px !important;
}

#gist-root .gist .blob-wrapper tr:last-child td {
    padding-bottom: 8px !important;
}

#gist-root .gist .blob-num {
    min-width: 42px !important;
    padding: 1px 10px !important;
    text-align: right !important;
    background-color: #f6f8fa !important;
    color: #8c959f !important;
    border-right: 1px solid #eaeef2 !important;
    user-select: none !important;
    font-variant-numeric: tabular-nums !important;
}

#gist-root .gist .blob-code {
    padding: 1px 14px !important;
    color: #1f2328 !important;
    background: transparent !important;
}

#gist-root .gist .highlight tr:hover td.blob-code {
    background-color: rgba(208, 215, 222, 0.22) !important;
}

#gist-root .gist .highlight tr:hover td.blob-num {
    background-color: #eef1f4 !important;
    color: #57606a !important;
}

#gist-root .gist .gist-meta {
    padding: 7px 12px !important;
    background-color: #f6f8fa !important;
    color: #656d76 !important;
    font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif !important;
    border-radius: 0 0 8px 8px !important;
}

#gist-root .gist .gist-meta a {
    color: #0969da !important;
    font-weight: 500 !important;
    text-decoration: none !important;
}

#gist-root .gist .gist-meta a:hover {
    text-decoration: underline !important;
}

#gist-root .gist .markdown-body {
    padding: 14px 18px !important;
}

/* 深色模式适配（中性深灰底色 + GitHub Primer Dark 代码高亮配色） */
:root[data-theme="dark"] #gist-root .gist {
    color: #e6edf3 !important;
}

:root[data-theme="dark"] #gist-root .gist .gist-file {
    background-color: #252526 !important;
    border-color: #3c3c3c !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28) !important;
}

:root[data-theme="dark"] #gist-root .gist .gist-data {
    background-color: #1e1e1e !important;
    border-bottom-color: #333333 !important;
}

:root[data-theme="dark"] #gist-root .gist .blob-num {
    background-color: #252526 !important;
    color: #858585 !important;
    border-right-color: #333333 !important;
}

:root[data-theme="dark"] #gist-root .gist .blob-code,
:root[data-theme="dark"] #gist-root .gist .blob-code-inner {
    color: #e6edf3 !important;
}

:root[data-theme="dark"] #gist-root .gist .highlight tr:hover td.blob-code {
    background-color: rgba(255, 255, 255, 0.05) !important;
}

:root[data-theme="dark"] #gist-root .gist .highlight tr:hover td.blob-num {
    background-color: #2d2d30 !important;
    color: #b0b8c4 !important;
}

:root[data-theme="dark"] #gist-root .gist .blob-code-inner::selection,
:root[data-theme="dark"] #gist-root .gist .blob-code-inner ::selection {
    background-color: rgba(88, 166, 255, 0.35) !important;
}

:root[data-theme="dark"] #gist-root .gist .gist-meta {
    background-color: #252526 !important;
    color: #9da5b4 !important;
}

:root[data-theme="dark"] #gist-root .gist .gist-meta a {
    color: #58a6ff !important;
}

:root[data-theme="dark"] #gist-root .gist .markdown-body {
    color: #e6edf3 !important;
    background-color: #1e1e1e !important;
}

:root[data-theme="dark"] #gist-root .gist .markdown-body h1,
:root[data-theme="dark"] #gist-root .gist .markdown-body h2 {
    border-bottom-color: #333333 !important;
}

:root[data-theme="dark"] #gist-root .gist .markdown-body blockquote {
    color: #8b949e !important;
    border-left-color: #3c3c3c !important;
}

:root[data-theme="dark"] #gist-root .gist .markdown-body code,
:root[data-theme="dark"] #gist-root .gist .markdown-body pre {
    background-color: #252526 !important;
    color: #e6edf3 !important;
}

:root[data-theme="dark"] #gist-root .gist .pl-c { color: #8b949e !important; font-style: italic; }
:root[data-theme="dark"] #gist-root .gist .pl-c1,
:root[data-theme="dark"] #gist-root .gist .pl-s .pl-v { color: #79c0ff !important; }
:root[data-theme="dark"] #gist-root .gist .pl-e,
:root[data-theme="dark"] #gist-root .gist .pl-en { color: #d2a8ff !important; }
:root[data-theme="dark"] #gist-root .gist .pl-smi,
:root[data-theme="dark"] #gist-root .gist .pl-s .pl-s1 { color: #e6edf3 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-ent { color: #7ee787 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-k { color: #ff7b72 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-s,
:root[data-theme="dark"] #gist-root .gist .pl-pds,
:root[data-theme="dark"] #gist-root .gist .pl-s .pl-pse .pl-s1,
:root[data-theme="dark"] #gist-root .gist .pl-sr,
:root[data-theme="dark"] #gist-root .gist .pl-sr .pl-cce,
:root[data-theme="dark"] #gist-root .gist .pl-sr .pl-sre,
:root[data-theme="dark"] #gist-root .gist .pl-sr .pl-sra { color: #a5d6ff !important; }
:root[data-theme="dark"] #gist-root .gist .pl-v,
:root[data-theme="dark"] #gist-root .gist .pl-smw { color: #ffa657 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-bu { color: #f85149 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-ii { color: #f0f6fc !important; background-color: #8e1519 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-mh,
:root[data-theme="dark"] #gist-root .gist .pl-mh .pl-en,
:root[data-theme="dark"] #gist-root .gist .pl-ms { font-weight: 700 !important; color: #1f6feb !important; }
:root[data-theme="dark"] #gist-root .gist .pl-mi { font-style: italic !important; color: #e6edf3 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-mb { font-weight: 700 !important; color: #e6edf3 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-md { color: #ffdcd7 !important; background-color: #67060c !important; }
:root[data-theme="dark"] #gist-root .gist .pl-mi1 { color: #aff5b4 !important; background-color: #033a16 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-mc { color: #ffdfb6 !important; background-color: #5a1e02 !important; }
:root[data-theme="dark"] #gist-root .gist .pl-corl { text-decoration: underline !important; color: #a5d6ff !important; }
</style>
</div>
<script>
(function () {
    var seq = window.__gistSeq;
    if (window.__gistScriptFailed) {
        return;
    }
    var root = document.getElementById('gist-root');
    var gistEl = root ? root.querySelector('.gist') : null;
    var hasValidContent = Boolean(
        gistEl && (gistEl.querySelector('.gist-file') || gistEl.querySelector('.gist-data'))
    );
    if (!hasValidContent) {
        window.__notifyGistError();
        return;
    }

    var lastHeight = 0;
    function reportHeight() {
        if (!root) return;
        var rectHeight = root.getBoundingClientRect().height;
        var targetEl = gistEl || root;
        var gistHeight = targetEl.getBoundingClientRect().height;
        var height = Math.ceil(Math.max(rectHeight, gistHeight, targetEl.offsetHeight || 0));
        if (Number.isFinite(height) && height > 0 && height !== lastHeight) {
            lastHeight = height;
            parent.postMessage({ type: 'gist:height', seq: seq, height: height }, '*');
        }
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window.parent) return;
        var msg = event.data;
        if (msg && msg.type === 'host:theme') {
            var nextMode = msg.mode === 'dark' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', nextMode);
            reportHeight();
        }
    });

    parent.postMessage({ type: 'gist:ready', seq: seq }, '*');
    reportHeight();

    if (typeof ResizeObserver === 'function') {
        var ro = new ResizeObserver(function () {
            reportHeight();
        });
        ro.observe(root);
        if (gistEl) {
            ro.observe(gistEl);
        }
    }

    window.addEventListener('load', reportHeight);
    window.addEventListener('resize', reportHeight);
    setTimeout(reportHeight, 60);
    setTimeout(reportHeight, 250);
})();
<\/script>
</body>
</html>`;
}
