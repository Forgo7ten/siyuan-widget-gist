export const MAX_RETRIES = 10;
export const INITIAL_DELAY_MS = 2_000;
export const MAX_DELAY_MS = 60_000;

const RESERVED_GIST_ROUTES = new Set([
    'discover',
    'forked',
    'login',
    'mine',
    'new',
    'public',
    'search',
    'settings',
    'starred',
]);

const SCRIPT_TAG_PATTERN = /^<script\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>\s*<\/script>$/i;
const GITHUB_USER_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const GIST_ID_PATTERN = /^[a-fA-F0-9]{1,64}$/;

/**
 * 计算第 retryIndex 次自动重试（0-based，0 表示第 1 次重试）的退避毫秒数。
 * 序列：2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s, 60s
 */
export function getRetryDelayMs(retryIndex) {
    const idx = Math.max(0, Math.trunc(retryIndex) || 0);
    return Math.min(INITIAL_DELAY_MS * (2 ** idx), MAX_DELAY_MS);
}

function stripJsExtension(segment) {
    if (typeof segment !== 'string') {
        return '';
    }
    return segment.toLowerCase().endsWith('.js') ? segment.slice(0, -3) : segment;
}

/**
 * 解析、校验并规范化用户输入的 Gist 地址或官方 <script> 嵌入标签。
 * @param {string} rawInput
 * @returns {{ ok: true, url: string } | { ok: false, error: string }}
 */
export function parseGistUrl(rawInput) {
    const invalidResult = {
        ok: false,
        error: '请输入有效的 GitHub Gist URL 或官方 <script> 嵌入代码',
    };

    if (typeof rawInput !== 'string') {
        return invalidResult;
    }

    let candidate = rawInput.trim();
    if (!candidate) {
        return invalidResult;
    }

    if (candidate.startsWith('<') || /<script\b/i.test(candidate)) {
        const match = SCRIPT_TAG_PATTERN.exec(candidate);
        if (!match) {
            return invalidResult;
        }
        candidate = (match[1] || match[2] || '').replace(/&amp;/gi, '&').trim();
        if (!candidate) {
            return invalidResult;
        }
    }

    let parsed;
    try {
        parsed = new URL(candidate);
    } catch {
        return invalidResult;
    }

    if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== 'gist.github.com' ||
        parsed.username !== '' ||
        parsed.password !== '' ||
        parsed.port !== ''
    ) {
        return invalidResult;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    let normalizedPath = '';

    if (segments.length === 1) {
        const gistId = stripJsExtension(segments[0]);
        if (!GIST_ID_PATTERN.test(gistId)) {
            return invalidResult;
        }
        normalizedPath = `/${gistId}.js`;
    } else if (segments.length === 2) {
        const [username, rawGistId] = segments;
        const gistId = stripJsExtension(rawGistId);
        if (
            !GITHUB_USER_PATTERN.test(username) ||
            RESERVED_GIST_ROUTES.has(username.toLowerCase()) ||
            !GIST_ID_PATTERN.test(gistId)
        ) {
            return invalidResult;
        }
        normalizedPath = `/${username}/${gistId}.js`;
    } else {
        return invalidResult;
    }

    const normalizedUrl = new URL(`https://gist.github.com${normalizedPath}`);
    const fileParam = parsed.searchParams.get('file');
    if (typeof fileParam === 'string') {
        const trimmedFile = fileParam.trim();
        if (trimmedFile) {
            normalizedUrl.searchParams.set('file', trimmedFile);
        }
    }

    return {
        ok: true,
        url: normalizedUrl.toString(),
    };
}
