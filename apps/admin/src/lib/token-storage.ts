const TOKEN_KEY = 'token';

function getStorage(): Storage | null {
  try {
    const w = (globalThis as any).window as any | undefined;
    return w?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function safeGetToken(): string | null {
  try {
    return getStorage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function safeSetToken(token: string): boolean {
  try {
    getStorage()?.setItem(TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveToken(): void {
  try {
    getStorage()?.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

