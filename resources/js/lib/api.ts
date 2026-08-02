/**
 * Extract XSRF-TOKEN cookie from document.cookie for CSRF validation.
 */
export function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(^|; )XSRF-TOKEN=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : '';
}

/**
 * Standardized fetch wrapper that sends web session cookies, CSRF tokens,
 * and JSON headers for API calls.
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {},
    organizationId?: number | string
): Promise<Response> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': getCsrfToken(),
        ...(options.headers as Record<string, string> || {}),
    };

    if (organizationId) {
        headers['X-Organization-Id'] = String(organizationId);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
    });
}
