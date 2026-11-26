import type { SummaryOptions } from '../../shared/types';
import type { ApiClient } from '../../services/ApiClient';

// Generates text summaries via AI API
export class SummaryService {
  private readonly client: ApiClient;

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  async generate(
    text: string,
    { style = 'concise', length = 'medium' }: SummaryOptions = {}
  ): Promise<string> {
    const prompt = `Summarize the following text in a ${style} style. Length: ${length}.\n\n${text}`;
    const response = await this.client.complete(prompt);
    return response.text;
  }
}
