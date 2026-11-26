import type { ExplanationOptions } from '../../shared/types';
import type { ApiClient } from '../../services/ApiClient';

// Explains text passages via AI
export class ExplanationService {
  private readonly client: ApiClient;

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  async generate(
    text: string,
    { level = 'intermediate' }: ExplanationOptions = {}
  ): Promise<string> {
    const prompt = `Explain the following text at a ${level} level in simple terms:\n\n${text}`;
    const response = await this.client.complete(prompt);
    return response.text;
  }
}
