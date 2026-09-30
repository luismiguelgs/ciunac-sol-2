export { cn } from "cn"

export const isPdf = (url: string | undefined | null): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Fast extension-based checks
    if (lower.endsWith('.pdf')) return true;
    if (lower.includes('.pdf?')) return true;
    // Heuristics for Google Drive and similar
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        const pathname = u.pathname.toLowerCase();
        const exportParam = u.searchParams.get('export')?.toLowerCase();
        // Google Drive: uc?export=download -> PDF (descarga)
        if (host === 'drive.google.com') {
        if (exportParam === 'download') return true;
        if (pathname.endsWith('/download')) return true;
        }
        // Generic: any URL indicating explicit download intent
        if (exportParam === 'download') return true;
        if (pathname.endsWith('/download')) return true;
        if (lower.includes('=download')) return true;
        // Fallback: path extension
        if (pathname.endsWith('.pdf')) return true;
    } catch {
        // ignore URL parse errors
    }
    return false;
}
