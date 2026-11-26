export const CUSTOM_ATTR_NAME = 'custom-gist-url';

export function resolveHostContext() {
    let hostFrame = null;
    let hostBlock = null;
    let blockId = '';

    try {
        hostFrame = window.frameElement || null;
        hostBlock = hostFrame?.closest?.('[data-type="NodeWidget"]') || null;
        blockId = hostBlock?.dataset?.nodeId || hostBlock?.getAttribute?.('data-node-id') || '';
    } catch {
        hostFrame = null;
        hostBlock = null;
        blockId = '';
    }

    return { hostFrame, hostBlock, blockId };
}

async function requestKernelApi(path, payload) {
    const response = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result || result.code !== 0) {
        throw new Error(result?.msg || '内核接口返回异常');
    }
    return result.data;
}

export async function getGistUrl(blockId) {
    const data = await requestKernelApi('/api/attr/getBlockAttrs', { id: blockId });
    return data && typeof data[CUSTOM_ATTR_NAME] === 'string' ? data[CUSTOM_ATTR_NAME].trim() : '';
}

export async function saveGistUrl(blockId, normalizedUrl, hostBlock = null) {
    await requestKernelApi('/api/attr/setBlockAttrs', {
        id: blockId,
        attrs: {
            [CUSTOM_ATTR_NAME]: normalizedUrl,
        },
    });
    try {
        hostBlock?.setAttribute?.(CUSTOM_ATTR_NAME, normalizedUrl);
    } catch {
        // 忽略 DOM 属性同步异常，以内核返回 code === 0 为准
    }
}

export function resizeHostElements(rootEl, hostFrame, hostBlock) {
    if (!rootEl) {
        return;
    }
    const rectHeight = Math.ceil(rootEl.getBoundingClientRect().height);
    if (!Number.isFinite(rectHeight) || rectHeight <= 0) {
        return;
    }
    const targetPx = `${rectHeight}px`;
    try {
        if (hostFrame && hostFrame.style.height !== targetPx) {
            hostFrame.style.height = targetPx;
        }
        if (hostBlock && hostBlock.style.height !== targetPx) {
            hostBlock.style.height = targetPx;
        }
    } catch {
        // 独立打开或受限环境下忽略
    }
}

export function parseCssRgbLuminance(colorStr) {
    if (typeof colorStr !== 'string') {
        return null;
    }
    const trimmed = colorStr.trim();
    const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(trimmed);
    if (rgbMatch) {
        const r = Number(rgbMatch[1]);
        const g = Number(rgbMatch[2]);
        const b = Number(rgbMatch[3]);
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
    if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return null;
}

export function isBgCompatibleWithMode(colorStr, mode) {
    const lum = parseCssRgbLuminance(colorStr);
    if (lum === null) {
        return false;
    }
    return mode === 'dark' ? lum < 128 : lum >= 128;
}

/**
 * 监听思源宿主明暗主题切换（同时覆盖 <html> 属性、<head> 主题样式表异步替换及系统配色变化）。
 * @returns {() => void} 清理函数
 */
export function observeHostTheme(hostBlock, onThemeChange) {
    const detectOsMode = () =>
        window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';

    try {
        const parentDoc = hostBlock?.ownerDocument || window.parent?.document;
        const parentWin = parentDoc?.defaultView || window.parent;
        if (!parentDoc || !parentWin || parentDoc === document) {
            onThemeChange(detectOsMode(), '');
            return () => {};
        }

        let settleTimer = null;

        const resolveHostMode = () => {
            const appearance = parentWin?.siyuan?.config?.appearance;
            if (appearance) {
                if (appearance.modeOS) {
                    return detectOsMode();
                }
                if (appearance.mode === 1) {
                    return 'dark';
                }
                if (appearance.mode === 0) {
                    return 'light';
                }
            }
            const attrMode =
                parentDoc.documentElement.getAttribute('data-theme-mode') ||
                parentDoc.body?.getAttribute('data-theme-mode') ||
                '';
            if (attrMode === 'dark' || attrMode === 'light') {
                return attrMode;
            }
            const defaultThemeHref = parentDoc.getElementById('themeDefaultStyle')?.getAttribute('href') || '';
            if (defaultThemeHref.includes('/midnight/')) {
                return 'dark';
            }
            if (defaultThemeHref.includes('/daylight/')) {
                return 'light';
            }
            return detectOsMode();
        };

        const syncNow = () => {
            const resolvedMode = resolveHostMode();
            const rootStyle = parentWin.getComputedStyle(parentDoc.documentElement);
            const varBg = rootStyle.getPropertyValue('--b3-theme-background').trim();
            const bodyBg = parentDoc.body
                ? parentWin.getComputedStyle(parentDoc.body).backgroundColor
                : '';
            const candidateBg = isBgCompatibleWithMode(varBg, resolvedMode)
                ? varBg
                : isBgCompatibleWithMode(bodyBg, resolvedMode)
                    ? bodyBg
                    : '';
            onThemeChange(resolvedMode, candidateBg);
        };

        const scheduleSync = () => {
            syncNow();
            if (settleTimer !== null) {
                clearTimeout(settleTimer);
            }
            settleTimer = setTimeout(() => {
                settleTimer = null;
                syncNow();
            }, 250);
        };

        syncNow();

        const cleanups = [];

        if (typeof MutationObserver === 'function') {
            const htmlObserver = new MutationObserver(scheduleSync);
            htmlObserver.observe(parentDoc.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme-mode', 'data-dark-theme', 'data-light-theme', 'class', 'style'],
            });
            cleanups.push(() => htmlObserver.disconnect());

            if (parentDoc.head) {
                const headObserver = new MutationObserver((mutations) => {
                    let themeLinkTouched = false;
                    for (const mutation of mutations) {
                        if (mutation.type === 'attributes') {
                            const target = mutation.target;
                            if (
                                target instanceof parentWin.HTMLLinkElement &&
                                (target.id === 'themeDefaultStyle' || target.id === 'themeStyle' || target.rel === 'stylesheet')
                            ) {
                                themeLinkTouched = true;
                                target.addEventListener('load', syncNow, { once: true });
                            }
                        } else if (mutation.type === 'childList') {
                            for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
                                if (node.nodeName === 'LINK') {
                                    themeLinkTouched = true;
                                    if (node.isConnected) {
                                        node.addEventListener('load', syncNow, { once: true });
                                    }
                                }
                            }
                        }
                    }
                    if (themeLinkTouched) {
                        scheduleSync();
                    }
                });
                headObserver.observe(parentDoc.head, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['href', 'id'],
                });
                cleanups.push(() => headObserver.disconnect());
            }
        }

        const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (mediaQuery?.addEventListener) {
            mediaQuery.addEventListener('change', scheduleSync);
            cleanups.push(() => mediaQuery.removeEventListener('change', scheduleSync));
        }

        return () => {
            if (settleTimer !== null) {
                clearTimeout(settleTimer);
                settleTimer = null;
            }
            for (const fn of cleanups) {
                fn();
            }
        };
    } catch {
        onThemeChange(detectOsMode(), '');
        return () => {};
    }
}

/**
 * 监听思源 NodeWidget 块 fold="1" 折叠属性变更。
 * @returns {{ initialFolded: boolean, dispose: () => void }}
 */
export function observeHostFold(hostBlock, onFoldChange) {
    if (!hostBlock) {
        return { initialFolded: false, dispose: () => {} };
    }

    const readFolded = () => hostBlock.getAttribute?.('fold') === '1';
    let lastFolded = readFolded();

    if (typeof MutationObserver !== 'function') {
        return { initialFolded: lastFolded, dispose: () => {} };
    }

    const observer = new MutationObserver(() => {
        const nextFolded = readFolded();
        if (nextFolded !== lastFolded) {
            lastFolded = nextFolded;
            onFoldChange(nextFolded);
        }
    });
    observer.observe(hostBlock, {
        attributes: true,
        attributeFilter: ['fold'],
    });

    return {
        initialFolded: lastFolded,
        dispose: () => observer.disconnect(),
    };
}
