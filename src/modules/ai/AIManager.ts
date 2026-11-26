import type {
  ExplanationOptions,
  QuestionOptions,
  QuizQuestion,
  SummaryOptions,
} from '../../shared/types';
import type { ApiClient } from '../../services/ApiClient';
import { SummaryService } from './SummaryService';
import { ExplanationService } from './ExplanationService';
import { QuestionGenerator } from './QuestionGenerator';

// Coordinates AI services
export class AIManager {
  private readonly summary: SummaryService;
  private readonly explanation: ExplanationService;
  private readonly questionGen: QuestionGenerator;

  constructor(apiClient: ApiClient) {
    this.summary = new SummaryService(apiClient);
    this.explanation = new ExplanationService(apiClient);
    this.questionGen = new QuestionGenerator(apiClient);
  }

  async summarize(text: string, options: SummaryOptions = {}): Promise<string> {
    return this.summary.generate(text, options);
  }

  async explain(text: string, options: ExplanationOptions = {}): Promise<string> {
    return this.explanation.generate(text, options);
  }

  async generateQuestions(
    text: string,
    options: QuestionOptions = {}
  ): Promise<QuizQuestion[]> {
    return this.questionGen.generate(text, options);
  }
}
