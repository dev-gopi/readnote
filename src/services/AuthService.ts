import { AuthError } from '../shared/errors/AppError';

// Handles authentication via chrome.identity
export class AuthService {
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    return this._refreshToken();
  }

  private async _refreshToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(
            new AuthError(chrome.runtime.lastError?.message ?? 'Failed to retrieve auth token')
          );
        } else {
          this.token = token;
          this.tokenExpiry = Date.now() + 3500 * 1000; // ~1 hour
          resolve(token);
        }
      });
    });
  }

  async signOut(): Promise<void> {
    if (!this.token) return;
    const tokenToRemove = this.token;
    return new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token: tokenToRemove }, () => {
        this.token = null;
        this.tokenExpiry = null;
        resolve();
      });
    });
  }

  isAuthenticated(): boolean {
    return Boolean(this.token) && Date.now() < (this.tokenExpiry ?? 0);
  }
}
