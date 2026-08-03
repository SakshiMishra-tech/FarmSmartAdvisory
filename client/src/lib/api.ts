const normalizeBaseUrl = (value?: string) => value?.replace(/\/$/, "") ?? "";

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL as string | undefined);
export const VOICE_API_BASE_URL = normalizeBaseUrl(
  (import.meta.env.VITE_VOICE_API_URL as string | undefined) ?? (import.meta.env.VITE_API_URL as string | undefined),
);

export function buildApiUrl(path: string, baseUrl: string = API_BASE_URL) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function buildVoiceApiUrl(path: string) {
  return buildApiUrl(path, VOICE_API_BASE_URL);
}