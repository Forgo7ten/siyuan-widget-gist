import {
    getGistUrl,
    isBgCompatibleWithMode,
    observeHostFold,
    observeHostTheme,
    resizeHostElements,
    resolveHostContext,
    saveGistUrl,
} from './src/host.js';
import { createGistLoader } from './src/loader.js';
import { getRetryDelayMs, parseGistUrl } from './src/url.js';
import { buildGistSrcdoc } from './src/sandbox-doc.js';

export { buildGistSrcdoc, getRetryDelayMs, parseGistUrl };

const state = {
    blockId: '',
    hostFrame: null,
    hostBlock: null,
    themeMode: 'light',
    folded: false,
    savedUrl: '',
    editing: true,
    saving: false,
    editBtnPointerDownWhileEditing: false,
};

const dom = {
    app: null,
    bar: null,
    field: null,
    stateTag: null,
    input: null,
    refreshBtn: null,
    editBtn: null,
    status: null,
    viewer: null,
};

let loader = null;

function resizeHost() {
    resizeHostElements(dom.app, state.hostFrame, state.hostBlock);
}

function setStatus(text, level = 'info') {
    if (!dom.status) {
        return;
    }
    if (!text) {
        dom.status.textContent = '';
        dom.status.hidden = true;
        delete dom.status.dataset.level;
    } else {
        dom.status.textContent = text;
        dom.status.dataset.level = level;
        dom.status.hidden = false;
    }
    resizeHost();
}

function clearInvalid() {
    dom.input?.removeAttribute('aria-invalid');
    if (dom.field) {
        delete dom.field.dataset.invalid;
    }
}

function markInvalid(message) {
    dom.input?.setAttribute('aria-invalid', 'true');
    if (dom.field) {
        dom.field.dataset.invalid = 'true';
    }
    setStatus(message, 'error');
}

function syncActionButtons() {
    const isLoading = Boolean(loader?.isLoading());
    if (dom.refreshBtn) {
        dom.refreshBtn.hidden = state.folded;
        dom.refreshBtn.disabled = !state.blockId || !state.savedUrl || state.saving || state.folded;
        if (isLoading) {
            dom.refreshBtn.dataset.loading = 'true';
        } else {
            delete dom.refreshBtn.dataset.loading;
        }
    }
    if (dom.editBtn) {
        dom.editBtn.disabled = !state.blockId || state.saving;
        if (state.editing) {
            dom.editBtn.dataset.active = 'true';
            dom.editBtn.title = '完成编辑（回车或移开焦点自动保存）';
            dom.editBtn.setAttribute('aria-label', '完成编辑');
        } else {
            delete dom.editBtn.dataset.active;
            dom.editBtn.title = '编辑 URL';
            dom.editBtn.setAttribute('aria-label', '编辑 URL');
        }
    }
    if (dom.stateTag) {
        if (!state.blockId) {
            dom.stateTag.textContent = '未连接';
            dom.stateTag.hidden = false;
        } else if (state.saving) {
            dom.stateTag.textContent = '保存中';
            dom.stateTag.hidden = false;
        } else if (state.editing) {
            dom.stateTag.textContent = '编辑中';
            dom.stateTag.hidden = false;
        } else if (state.folded) {
            dom.stateTag.textContent = '已折叠';
            dom.stateTag.hidden = false;
        } else {
            dom.stateTag.textContent = '';
            dom.stateTag.hidden = true;
        }
    }
}

function setEditing(active, { focus = false, select = false } = {}) {
    if (!dom.input || !dom.bar) {
        return;
    }
    state.editing = Boolean(active);
    dom.bar.dataset.editing = state.editing ? 'true' : 'false';
    dom.input.readOnly = !state.editing;
    dom.input.title = state.editing ? '' : '双击或点击右侧编辑按钮修改 URL';

    if (!state.editing) {
        clearInvalid();
    }

    syncActionButtons();
    resizeHost();

    if (state.editing && focus) {
        queueMicrotask(() => {
            dom.input?.focus();
            if (select && dom.input?.value) {
                dom.input.select();
            }
        });
    }
}

function applyThemeMode(mode, hostBg = '') {
    const resolved = mode === 'dark' ? 'dark' : 'light';
    state.themeMode = resolved;
    document.documentElement.setAttribute('data-theme-mode', resolved);
    if (hostBg && isBgCompatibleWithMode(hostBg, resolved)) {
        document.documentElement.style.setProperty('--gist-bg', hostBg);
    } else {
        document.documentElement.style.removeProperty('--gist-bg');
    }
    loader?.broadcastTheme(resolved);
}

function applyFoldState(nextFolded) {
    const folded = Boolean(nextFolded);
    const changed = state.folded !== folded;
    state.folded = folded;

    if (dom.app) {
        dom.app.dataset.folded = folded ? 'true' : 'false';
    }

    if (folded) {
        loader?.cancel({ removeRendered: true });
        if (!dom.field?.dataset.invalid) {
            setStatus('');
        }
        syncActionButtons();
        resizeHost();
        return;
    }

    syncActionButtons();
    if (changed && state.savedUrl && !loader?.hasRendered() && !loader?.isActive()) {
        loader?.start(state.savedUrl);
    } else {
        resizeHost();
    }
}

async function commitInput({ trigger = 'enter' } = {}) {
    if (!state.editing || state.saving || !dom.input) {
        return;
    }

    if (!state.blockId) {
        setStatus('请在思源笔记挂件中打开', 'error');
        return;
    }

    const raw = dom.input.value.trim();

    if (!raw) {
        if (!state.savedUrl) {
            if (trigger === 'blur') {
                clearInvalid();
                setStatus('');
            } else {
                markInvalid('请输入有效的 GitHub Gist URL 或官方 <script> 嵌入代码');
            }
            return;
        }
        markInvalid('Gist URL 不能为空，按 Esc 可恢复已保存地址');
        return;
    }

    const parsed = parseGistUrl(raw);
    if (!parsed.ok) {
        markInvalid(parsed.error);
        return;
    }

    clearInvalid();

    if (state.savedUrl && parsed.url === state.savedUrl) {
        dom.input.value = parsed.url;
        setEditing(false);
        dom.input.blur();
        const needsReload = trigger === 'enter' || (!loader?.hasRendered() && !loader?.isActive());
        if (needsReload) {
            loader?.start(parsed.url);
        } else if (loader?.hasRendered()) {
            setStatus('');
        }
        return;
    }

    state.saving = true;
    dom.input.readOnly = true;
    syncActionButtons();

    try {
        await saveGistUrl(state.blockId, parsed.url, state.hostBlock);
        state.savedUrl = parsed.url;
        dom.input.value = parsed.url;
        setEditing(false);
        dom.input.blur();
        loader?.start(parsed.url);
    } catch (err) {
        setEditing(true, { focus: false });
        markInvalid(`保存 Gist URL 失败：${err?.message || '请稍后重试'}`);
    } finally {
        state.saving = false;
        syncActionButtons();
        resizeHost();
    }
}

function handleInputKeydown(event) {
    if (event.isComposing || event.keyCode === 229) {
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        void commitInput({ trigger: 'enter' });
        return;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        clearInvalid();
        if (state.savedUrl) {
            dom.input.value = state.savedUrl;
            setEditing(false);
            dom.input.blur();
            if (loader?.hasRendered() && !loader?.isActive()) {
                setStatus('');
            }
        } else {
            setStatus('');
        }
    }
}

function handleInputBlur() {
    void commitInput({ trigger: 'blur' });
}

function handleFieldDblClick() {
    if (state.editing || state.saving || !state.blockId) {
        return;
    }
    setEditing(true, { focus: true, select: true });
}

function handleRefreshClick() {
    if (state.saving || !state.savedUrl || state.folded) {
        return;
    }
    loader?.start(state.savedUrl);
}

function handleEditPointerDown() {
    state.editBtnPointerDownWhileEditing = state.editing;
}

function handleEditClick() {
    const wasEditing = state.editBtnPointerDownWhileEditing;
    state.editBtnPointerDownWhileEditing = false;

    if (state.saving || !state.blockId) {
        return;
    }

    if (wasEditing) {
        if (state.editing) {
            void commitInput({ trigger: 'blur' });
        }
        return;
    }

    setEditing(true, { focus: true, select: true });
}

async function loadInitialConfig() {
    if (!state.blockId) {
        setEditing(false);
        if (dom.input) {
            dom.input.disabled = true;
        }
        syncActionButtons();
        setStatus('请在思源笔记挂件中打开', 'error');
        return;
    }

    try {
        const storedUrl = await getGistUrl(state.blockId);
        if (!storedUrl) {
            dom.input.value = '';
            setEditing(true, { focus: true, select: false });
            setStatus('');
            return;
        }

        const parsed = parseGistUrl(storedUrl);
        if (!parsed.ok) {
            dom.input.value = storedUrl;
            setEditing(true, { focus: true, select: true });
            markInvalid('已保存的 Gist URL 格式无效，请重新输入并保存');
            return;
        }

        state.savedUrl = parsed.url;
        dom.input.value = parsed.url;
        setEditing(false);
        loader?.start(parsed.url);
    } catch (err) {
        setEditing(true, { focus: false });
        setStatus(`读取挂件属性失败：${err?.message || '请检查思源内核连接'}`, 'error');
    }
}

export async function init() {
    if (typeof document === 'undefined') {
        return;
    }

    dom.app = document.getElementById('app');
    dom.bar = document.getElementById('bar');
    dom.field = document.getElementById('field');
    dom.stateTag = document.getElementById('state-tag');
    dom.input = document.getElementById('url-input');
    dom.refreshBtn = document.getElementById('refresh-btn');
    dom.editBtn = document.getElementById('edit-btn');
    dom.status = document.getElementById('status');
    dom.viewer = document.getElementById('viewer');

    if (!dom.app || !dom.input) {
        return;
    }

    const { hostFrame, hostBlock, blockId } = resolveHostContext();
    state.hostFrame = hostFrame;
    state.hostBlock = hostBlock;
    state.blockId = blockId;

    loader = createGistLoader({
        viewerEl: dom.viewer,
        getThemeMode: () => state.themeMode,
        getSavedUrl: () => state.savedUrl,
        isFolded: () => state.folded,
        hasValidationError: () => Boolean(dom.field?.dataset.invalid),
        onStatus: setStatus,
        onLoadingStateChange: syncActionButtons,
        onResize: resizeHost,
    });

    const disposeTheme = observeHostTheme(state.hostBlock, applyThemeMode);
    const foldHandle = observeHostFold(state.hostBlock, applyFoldState);
    state.folded = foldHandle.initialFolded;
    dom.app.dataset.folded = state.folded ? 'true' : 'false';

    dom.input.addEventListener('keydown', handleInputKeydown);
    dom.input.addEventListener('blur', handleInputBlur);
    dom.field?.addEventListener('dblclick', handleFieldDblClick);
    dom.input.addEventListener('input', () => {
        if (dom.field?.dataset.invalid) {
            clearInvalid();
            if (dom.status?.dataset.level === 'error' && !loader?.isActive()) {
                setStatus('');
            }
        }
    });
    dom.refreshBtn?.addEventListener('click', handleRefreshClick);
    dom.editBtn?.addEventListener('pointerdown', handleEditPointerDown);
    dom.editBtn?.addEventListener('click', handleEditClick);

    let appObserver = null;
    if (typeof ResizeObserver === 'function') {
        appObserver = new ResizeObserver(resizeHost);
        appObserver.observe(dom.app);
    }

    window.addEventListener('resize', resizeHost);
    window.addEventListener(
        'pagehide',
        () => {
            loader?.dispose();
            disposeTheme();
            foldHandle.dispose();
            appObserver?.disconnect();
            window.removeEventListener('resize', resizeHost);
        },
        { once: true }
    );

    await loadInitialConfig();
    resizeHost();
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
    void init();
}
