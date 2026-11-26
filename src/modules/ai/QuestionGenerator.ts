import type { QuestionOptions, QuizQuestion } from '../../shared/types';
import type { ApiClient } from '../../services/ApiClient';

// Generates quiz questions from text
export class QuestionGenerator {
  private readonly client: ApiClient;

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  async generate(
    text: string,
    { count = 5, type = 'multiple-choice' }: QuestionOptions = {}
  ): Promise<QuizQuestion[]> {
    const prompt = `Generate ${count} ${type} quiz questions based on the following text. Return JSON array with fields: question, options (array), answer.\n\n${text}`;
    const response = await this.client.complete(prompt);
    try {
      return JSON.parse(response.text) as QuizQuestion[];
    } catch {
      return [];
    }
  }
}
