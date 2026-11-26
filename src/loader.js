import { MAX_RETRIES, getRetryDelayMs } from './url.js';
import { buildGistSrcdoc } from './sandbox-doc.js';

const LOAD_TIMEOUT_MS = 20_000;

function destroyFrame(frame) {
    if (!frame) {
        return;
    }
    try {
        frame.srcdoc = '';
        frame.remove();
    } catch {
        // 忽略移除异常
    }
}

/**
 * 管理内层沙箱 iframe 生命周期、20 秒加载超时、10 次指数退避重试与 postMessage 通信。
 */
export function createGistLoader({
    viewerEl,
    getThemeMode,
    getSavedUrl,
    isFolded,
    hasValidationError,
    onStatus,
    onLoadingStateChange,
    onResize,
}) {
    let retryCount = 0;
    let retryTimer = null;
    let countdownTimer = null;
    let loadTimer = null;
    let currentFrame = null;
    let renderedFrame = null;
    let hasRenderedContent = false;
    let loadSettled = false;
    let loadSeq = 0;

    function clearTimers() {
        if (loadTimer !== null) {
            clearTimeout(loadTimer);
            loadTimer = null;
        }
        if (retryTimer !== null) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
        if (countdownTimer !== null) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        onLoadingStateChange();
    }

    function destroyCurrentFrame() {
        if (currentFrame) {
            destroyFrame(currentFrame);
            currentFrame = null;
        }
    }

    function cancel({ removeRendered = false } = {}) {
        clearTimers();
        loadSettled = true;
        loadSeq += 1;
        destroyCurrentFrame();
        if (removeRendered) {
            if (renderedFrame) {
                destroyFrame(renderedFrame);
                renderedFrame = null;
            }
            hasRenderedContent = false;
            if (viewerEl) {
                viewerEl.hidden = true;
                viewerEl.innerHTML = '';
            }
        }
        onLoadingStateChange();
    }

    function broadcastTheme(mode) {
        const payload = { type: 'host:theme', mode };
        for (const frame of [currentFrame, renderedFrame]) {
            try {
                frame?.contentWindow?.postMessage(payload, '*');
            } catch {
                // 忽略已卸载 frame
            }
        }
    }

    function scheduleRetry() {
        if (retryCount >= MAX_RETRIES) {
            onStatus(`加载失败，已达重试上限（${MAX_RETRIES}/${MAX_RETRIES}），请刷新或编辑 URL`, 'error');
            return;
        }

        const nextAttemptNumber = retryCount + 1;
        const delayMs = getRetryDelayMs(retryCount);
        let remainingSeconds = Math.ceil(delayMs / 1000);

        const updateRetryText = () => {
            onStatus(`加载失败，${remainingSeconds} 秒后重试（${nextAttemptNumber}/${MAX_RETRIES}）`, 'error');
        };
        updateRetryText();

        countdownTimer = setInterval(() => {
            remainingSeconds = Math.max(1, remainingSeconds - 1);
            updateRetryText();
        }, 1000);

        retryTimer = setTimeout(() => {
            if (countdownTimer !== null) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
            retryTimer = null;
            retryCount = nextAttemptNumber;
            const url = getSavedUrl();
            if (url && !isFolded()) {
                renderAttempt(url);
            }
        }, delayMs);
    }

    function handleLoadSuccess(seq) {
        if (seq !== loadSeq || loadSettled) {
            return;
        }
        loadSettled = true;
        clearTimers();
        retryCount = 0;

        if (renderedFrame && renderedFrame !== currentFrame) {
            destroyFrame(renderedFrame);
        }
        renderedFrame = currentFrame;
        currentFrame = null;
        hasRenderedContent = true;

        if (renderedFrame) {
            renderedFrame.hidden = false;
            broadcastTheme(getThemeMode());
        }
        if (viewerEl) {
            viewerEl.hidden = false;
        }
        if (!hasValidationError()) {
            onStatus('');
        }
        onLoadingStateChange();
        onResize();
    }

    function handleLoadFailure(seq) {
        if (seq !== loadSeq || loadSettled) {
            return;
        }
        loadSettled = true;
        clearTimers();
        destroyCurrentFrame();

        if (!renderedFrame && viewerEl) {
            hasRenderedContent = false;
            viewerEl.hidden = true;
            viewerEl.innerHTML = '';
        }

        onLoadingStateChange();
        scheduleRetry();
    }

    function renderAttempt(url) {
        clearTimers();
        destroyCurrentFrame();

        const seq = ++loadSeq;
        loadSettled = false;

        const retrySuffix = retryCount > 0 ? `（重试 ${retryCount}/${MAX_RETRIES}）` : '';
        onStatus(`正在加载 Gist...${retrySuffix}`, 'info');

        const iframe = document.createElement('iframe');
        iframe.className = 'gist-sandbox-frame';
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.referrerPolicy = 'no-referrer';
        iframe.setAttribute('title', 'GitHub Gist');

        // 新尝试未就绪前先隐藏挂载，保持编辑/重加载期间原已渲染内容可见
        if (renderedFrame) {
            iframe.hidden = true;
        }

        currentFrame = iframe;

        if (viewerEl) {
            viewerEl.appendChild(iframe);
            if (!renderedFrame) {
                viewerEl.hidden = true;
            }
        }

        iframe.srcdoc = buildGistSrcdoc(url, seq, getThemeMode());

        loadTimer = setTimeout(() => {
            handleLoadFailure(seq);
        }, LOAD_TIMEOUT_MS);

        onLoadingStateChange();
        onResize();
    }

    function start(url) {
        if (isFolded()) {
            cancel({ removeRendered: true });
            if (!hasValidationError()) {
                onStatus('');
            }
            onResize();
            return;
        }
        cancel({ removeRendered: false });
        retryCount = 0;
        onLoadingStateChange();
        renderAttempt(url);
    }

    function handleMessage(event) {
        const isCurrent = Boolean(currentFrame && event.source === currentFrame.contentWindow);
        const isRendered = Boolean(renderedFrame && event.source === renderedFrame.contentWindow);
        if (!isCurrent && !isRendered) {
            return;
        }

        const data = event.data;
        if (!data || typeof data !== 'object') {
            return;
        }

        if (data.type === 'gist:ready') {
            if (isCurrent && (typeof data.seq !== 'number' || data.seq === loadSeq)) {
                handleLoadSuccess(loadSeq);
            }
            return;
        }

        if (data.type === 'gist:error') {
            if (isCurrent && (typeof data.seq !== 'number' || data.seq === loadSeq)) {
                handleLoadFailure(loadSeq);
            }
            return;
        }

        if (data.type === 'gist:height') {
            const targetFrame = isRendered ? renderedFrame : currentFrame;
            if (!targetFrame) {
                return;
            }
            const height = Number(data.height);
            if (!Number.isFinite(height) || height <= 0) {
                return;
            }
            const normalizedHeight = `${Math.ceil(height)}px`;
            if (viewerEl && viewerEl.hidden && hasRenderedContent) {
                viewerEl.hidden = false;
            }
            if (targetFrame.style.height !== normalizedHeight) {
                targetFrame.style.height = normalizedHeight;
                onResize();
            }
        }
    }

    window.addEventListener('message', handleMessage);

    return {
        start,
        cancel,
        broadcastTheme,
        isLoading: () => loadTimer !== null,
        isActive: () => loadTimer !== null || retryTimer !== null || currentFrame !== null,
        hasRendered: () => hasRenderedContent,
        dispose: () => {
            cancel({ removeRendered: true });
            window.removeEventListener('message', handleMessage);
        },
    };
}
