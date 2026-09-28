/**
 * Resolve a file from Vite's public directory beneath the artifact base path.
 * Normalize the trailing slash because BASE_PATH may be configured as `/app`
 * or `/app/` in different environments.
 */
export function getPublicAssetUrl(
  filePath: string,
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  const base = baseUrl || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${filePath.replace(/^\/+/, '')}`;
}