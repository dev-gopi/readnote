import type { AICompletionResponse } from '../shared/types';
import { ApiError } from '../shared/errors/AppError';
import type { AuthService } from './AuthService';

// HTTP client for backend API calls
export class ApiClient {
  private readonly baseUrl: string;
  private readonly auth: AuthService;

  constructor(baseUrl: string, authService: AuthService) {
    this.baseUrl = baseUrl;
    this.auth = authService;
  }

  private async _request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body: unknown = null
  ): Promise<T> {
    const token = await this.auth.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchInit: RequestInit = {
      method,
      headers,
    };
    if (body !== null) {
      fetchInit.body = JSON.stringify(body);
    }
    const res = await fetch(`${this.baseUrl}${endpoint}`, fetchInit);

    if (!res.ok) {
      throw new ApiError(`API Error ${res.status}: ${res.statusText}`, res.status);
    }
    return (await res.json()) as T;
  }

  async complete(prompt: string, model = 'default'): Promise<AICompletionResponse> {
    return this._request<AICompletionResponse>('POST', '/ai/complete', { prompt, model });
  }

  async get<T = unknown>(endpoint: string): Promise<T> {
    return this._request<T>('GET', endpoint);
  }

  async post<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    return this._request<T>('POST', endpoint, body);
  }

  async put<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    return this._request<T>('PUT', endpoint, body);
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this._request<T>('DELETE', endpoint);
  }
}
