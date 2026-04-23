import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import { getCredentialsMode } from '../utils/authCookieHelper';

export const DESIGN_SYSTEM_PROFILE_STORAGE_KEY = 'isa_design_system_profile';

export type DesignSystemSource = 'url' | 'manual' | 'defaults';
export type AppModeForDesignOnboarding = 'chat' | 'design' | 'browse';

export interface DesignSystemTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface DesignSystemProfile {
  id: string;
  source: DesignSystemSource;
  sourceValue?: string;
  tokens: DesignSystemTokens;
  completedAt: string;
  screenshotUrl?: string;
  skipped?: boolean;
}

export interface BrandExtractionInput {
  source: Extract<DesignSystemSource, 'url' | 'manual'>;
  sourceValue?: string;
  manual?: Record<string, unknown>;
}

export interface SaveDesignSystemProfileResult {
  local: boolean;
  remote: boolean;
}

export const DEFAULT_DESIGN_SYSTEM_TOKENS: DesignSystemTokens = {
  colors: {
    primary: '#111111',
    secondary: '#525252',
    accent: '#f59e0b',
    background: '#1a1a1a',
    surface: '#222222',
    text: '#f5f5f5',
  },
  typography: {
    heading: 'DM Sans',
    body: 'DM Sans',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
};

const FALLBACK_ACCENTS = ['#f59e0b', '#0ea5e9', '#22c55e', '#ef4444', '#a855f7', '#14b8a6'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function createProfileId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dsp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readStoredProfile(): DesignSystemProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(DESIGN_SYSTEM_PROFILE_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as DesignSystemProfile;
  } catch {
    return null;
  }
}

function writeStoredProfile(profile: DesignSystemProfile): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(DESIGN_SYSTEM_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = authTokenStore.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCreativeBrandEndpoint(): string | null {
  const configured =
    process.env.NEXT_PUBLIC_CREATIVE_BRAND_ENDPOINT ||
    process.env.NEXT_PUBLIC_CREATIVE_DESIGN_URL ||
    process.env.NEXT_PUBLIC_CREATIVE_URL;

  if (!configured) return null;

  const base = configured.replace(/\/+$/, '');
  if (/\/brand$/i.test(base)) return base;
  return `${base}/api/v1/design/brand`;
}

function inferUrlTokens(url: string): DesignSystemTokens {
  const accent = FALLBACK_ACCENTS[hashString(url) % FALLBACK_ACCENTS.length];
  return normalizeDesignTokens({
    colors: {
      primary: DEFAULT_DESIGN_SYSTEM_TOKENS.colors.primary,
      secondary: DEFAULT_DESIGN_SYSTEM_TOKENS.colors.secondary,
      accent,
    },
  });
}

export function normalizeDesignTokens(rawTokens: unknown): DesignSystemTokens {
  const raw = isObject(rawTokens) && isObject(rawTokens.tokens)
    ? rawTokens.tokens
    : rawTokens;
  const tokenRecord = isObject(raw) ? raw : {};

  const rawColors = tokenRecord.colors ?? tokenRecord.palette;
  const colorArray = Array.isArray(rawColors) ? rawColors.map(asString).filter(Boolean) : [];
  const colorRecord = isObject(rawColors) ? rawColors : {};

  const rawFonts = isObject(tokenRecord.fonts) ? tokenRecord.fonts : {};
  const rawTypography = isObject(tokenRecord.typography) ? tokenRecord.typography : {};
  const rawRadii = isObject(tokenRecord.radii) ? tokenRecord.radii : {};
  const rawSpacing = isObject(tokenRecord.spacing) ? tokenRecord.spacing : {};

  const primary = pickString(colorRecord, ['primary', 'brand', 'main']) ?? colorArray[0] ?? DEFAULT_DESIGN_SYSTEM_TOKENS.colors.primary;
  const secondary = pickString(colorRecord, ['secondary', 'muted']) ?? colorArray[1] ?? DEFAULT_DESIGN_SYSTEM_TOKENS.colors.secondary;
  const accent = pickString(colorRecord, ['accent', 'highlight']) ?? colorArray[2] ?? DEFAULT_DESIGN_SYSTEM_TOKENS.colors.accent;
  const radius = asString(tokenRecord.borderRadius) ?? asString(tokenRecord.radius);

  return {
    colors: {
      primary,
      secondary,
      accent,
      background: pickString(colorRecord, ['background', 'bg']) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.colors.background,
      surface: pickString(colorRecord, ['surface', 'card']) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.colors.surface,
      text: pickString(colorRecord, ['text', 'foreground']) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.colors.text,
    },
    typography: {
      heading: pickString(rawTypography, ['heading', 'display']) ?? pickString(rawFonts, ['heading', 'display']) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.typography.heading,
      body: pickString(rawTypography, ['body', 'sans']) ?? pickString(rawFonts, ['body', 'sans']) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.typography.body,
    },
    spacing: {
      xs: asString(rawSpacing.xs) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.spacing.xs,
      sm: asString(rawSpacing.sm) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.spacing.sm,
      md: asString(rawSpacing.md) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.spacing.md,
      lg: asString(rawSpacing.lg) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.spacing.lg,
      xl: asString(rawSpacing.xl) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.spacing.xl,
    },
    radii: {
      sm: asString(rawRadii.sm) ?? radius ?? DEFAULT_DESIGN_SYSTEM_TOKENS.radii.sm,
      md: asString(rawRadii.md) ?? radius ?? DEFAULT_DESIGN_SYSTEM_TOKENS.radii.md,
      lg: asString(rawRadii.lg) ?? radius ?? DEFAULT_DESIGN_SYSTEM_TOKENS.radii.lg,
      xl: asString(rawRadii.xl) ?? DEFAULT_DESIGN_SYSTEM_TOKENS.radii.xl,
    },
  };
}

export function buildDesignSystemProfile({
  source,
  sourceValue,
  tokens = DEFAULT_DESIGN_SYSTEM_TOKENS,
  screenshotUrl,
  skipped = false,
}: {
  source: DesignSystemSource;
  sourceValue?: string;
  tokens?: DesignSystemTokens;
  screenshotUrl?: string;
  skipped?: boolean;
}): DesignSystemProfile {
  return {
    id: createProfileId(),
    source,
    sourceValue,
    tokens,
    completedAt: new Date().toISOString(),
    screenshotUrl,
    skipped,
  };
}

export function shouldShowDesignSystemOnboarding(
  appMode: AppModeForDesignOnboarding,
  profile: DesignSystemProfile | null,
  isLoading: boolean,
): boolean {
  return appMode === 'design' && !isLoading && !profile;
}

export async function extractDesignSystemProfile(input: BrandExtractionInput): Promise<DesignSystemProfile> {
  if (input.source === 'manual') {
    return buildDesignSystemProfile({
      source: 'manual',
      sourceValue: input.sourceValue,
      tokens: normalizeDesignTokens(input.manual ?? {}),
    });
  }

  const sourceValue = input.sourceValue?.trim();
  if (!sourceValue) {
    throw new Error('Enter a brand URL before extracting tokens.');
  }

  const endpoint = getCreativeBrandEndpoint();
  if (endpoint && typeof fetch !== 'undefined') {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: getCredentialsMode(),
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ url: sourceValue }),
      });

      if (response.ok) {
        const data = await response.json();
        return buildDesignSystemProfile({
          source: 'url',
          sourceValue,
          tokens: normalizeDesignTokens(data.tokens ?? data),
          screenshotUrl: data.screenshot_url ?? data.screenshotUrl,
        });
      }
    } catch {
      // Fall through to deterministic local extraction so the onboarding is not blocked.
    }
  }

  return buildDesignSystemProfile({
    source: 'url',
    sourceValue,
    tokens: inferUrlTokens(sourceValue),
  });
}

export async function loadDesignSystemProfile(): Promise<DesignSystemProfile | null> {
  const localProfile = readStoredProfile();
  if (localProfile) return localProfile;

  if (typeof fetch === 'undefined') return null;

  try {
    const response = await fetch(GATEWAY_ENDPOINTS.ACCOUNTS.ME, {
      method: 'GET',
      credentials: getCredentialsMode(),
      headers: getAuthHeaders(),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const profile = data?.preferences?.design_system_profile as DesignSystemProfile | undefined;
    if (!profile) return null;

    writeStoredProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

export async function saveDesignSystemProfile(profile: DesignSystemProfile): Promise<SaveDesignSystemProfileResult> {
  const local = writeStoredProfile(profile);
  let remote = false;

  if (typeof fetch === 'undefined') {
    return { local, remote };
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    };
    const currentResponse = await fetch(GATEWAY_ENDPOINTS.ACCOUNTS.ME, {
      method: 'GET',
      credentials: getCredentialsMode(),
      headers,
    });
    const currentProfile = currentResponse.ok ? await currentResponse.json() : {};
    const preferences = {
      ...(currentProfile?.preferences ?? {}),
      design_system_profile: profile,
    };

    const response = await fetch(GATEWAY_ENDPOINTS.ACCOUNTS.ME, {
      method: 'PATCH',
      credentials: getCredentialsMode(),
      headers,
      body: JSON.stringify({ preferences }),
    });
    if (response.ok) {
      const updatedProfile = await response.json().catch(() => null);
      remote = Boolean(updatedProfile?.preferences?.design_system_profile);
    }
  } catch {
    remote = false;
  }

  return { local, remote };
}

export function clearStoredDesignSystemProfile(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(DESIGN_SYSTEM_PROFILE_STORAGE_KEY);
  } catch {
    // noop
  }
}
