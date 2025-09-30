// Claude API ラッパー実装（Token-based Authentication）

import { ClaudeExecutionOptions, ClaudeExecutionResult } from './types';
import { CLAUDE_CONFIG } from './constants';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class ClaudeWrapper {
  private model: string;
  private tokenData: TokenData | null = null;

  constructor() {
    this.model = CLAUDE_CONFIG.MODEL;
    this.loadTokenData();
  }

  private loadTokenData(): void {
    const accessToken = process.env.CLAUDE_ACCESS_TOKEN;
    const refreshToken = process.env.CLAUDE_REFRESH_TOKEN;
    const expiresAt = process.env.CLAUDE_EXPIRES_AT;

    if (accessToken && refreshToken && expiresAt) {
      this.tokenData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt, 10),
      };
    } else {
      console.warn('Claude tokens not set. Using mock responses.');
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.tokenData) {
      throw new Error('No token data available');
    }

    try {
      const response = await fetch('https://claude.ai/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.tokenData.refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      this.tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || this.tokenData.refresh_token,
        expires_at: data.expires_at,
      };

      console.log('Access token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  private async ensureValidToken(): Promise<string> {
    if (!this.tokenData) {
      throw new Error('No token data available');
    }

    const now = Date.now() / 1000;
    if (now >= this.tokenData.expires_at - 300) {
      await this.refreshAccessToken();
    }

    return this.tokenData.access_token;
  }

  async execute(options: ClaudeExecutionOptions): Promise<ClaudeExecutionResult> {
    try {
      console.log(`Executing Claude API request: ${options.action}`);

      if (!this.tokenData) {
        return this.getMockResponse(options);
      }

      const accessToken = await this.ensureValidToken();
      const prompt = this.formatPrompt(options);

      const response = await fetch('https://claude.ai/api/append_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'anthropic-client-sha': 'unknown',
          'anthropic-client-version': 'unknown',
        },
        body: JSON.stringify({
          completion: {
            prompt: prompt,
            model: this.model,
            max_tokens_to_sample: options.options?.maxTokens || 1024,
          },
          organization_uuid: process.env.CLAUDE_ORGANIZATION_UUID || null,
          conversation_uuid: process.env.CLAUDE_CONVERSATION_UUID || null,
          text: prompt,
          attachments: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.completion || data.text || '';

      return this.parseResponse(responseText, options.action);
    } catch (error) {
      console.error('Claude API error:', error);
      return this.getMockResponse(options);
    }
  }

  private formatPrompt(options: ClaudeExecutionOptions): string {
    let prompt = '';

    switch (options.action) {
      case 'generate':
        prompt = `You are a code generator. Generate ${options.language || 'code'} based on the following requirements:\n\n${options.prompt}`;
        if (options.framework) {
          prompt += `\n\nUse the ${options.framework} framework.`;
        }
        if (options.options?.includeComments) {
          prompt += '\n\nInclude helpful comments in the code.';
        }
        if (options.options?.includeTests) {
          prompt += '\n\nInclude unit tests.';
        }
        break;

      case 'analyze':
        prompt = `Analyze the following code and provide insights:\n\n${options.prompt}`;
        break;

      case 'optimize':
        prompt = `Optimize the following code for better performance:\n\n${options.prompt}`;
        break;

      case 'review':
        prompt = `Review the following code and suggest improvements:\n\n${options.prompt}`;
        break;

      default:
        prompt = options.prompt;
    }

    return prompt;
  }

  private parseResponse(responseText: string, action: string): ClaudeExecutionResult {
    const result: ClaudeExecutionResult = {};

    switch (action) {
      case 'generate':
        result.code = this.extractCode(responseText);
        result.explanation = responseText;
        break;

      case 'analyze':
        result.analysis = responseText;
        break;

      case 'optimize':
        result.code = this.extractCode(responseText);
        result.suggestions = this.extractSuggestions(responseText);
        break;

      case 'review':
        result.suggestions = this.extractSuggestions(responseText);
        result.explanation = responseText;
        break;

      default:
        result.explanation = responseText;
    }

    return result;
  }

  private extractCode(text: string): string {
    // コードブロックを抽出
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const matches = text.match(codeBlockRegex);

    if (matches && matches.length > 0) {
      return matches[0].replace(/```[\w]*\n/, '').replace(/```$/, '').trim();
    }

    return text.trim();
  }

  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim().match(/^[-*]\s/)) {
        suggestions.push(line.trim().replace(/^[-*]\s/, ''));
      }
    }

    return suggestions.length > 0 ? suggestions : [text];
  }

  private getMockResponse(options: ClaudeExecutionOptions): ClaudeExecutionResult {
    console.log('Returning mock response (ANTHROPIC_API_KEY not set)');

    const result: ClaudeExecutionResult = {};

    switch (options.action) {
      case 'generate':
        result.code = `// Mock ${options.language || 'code'} generated by Claude Sheets API\n// Prompt: ${options.prompt.substring(0, 50)}...\n\nfunction example() {\n  console.log('Hello from Google Sheets!');\n  return 'Success';\n}`;
        result.explanation = 'This is a mock response. Set ANTHROPIC_API_KEY environment variable to use real Claude API.';
        break;

      case 'analyze':
        result.analysis = `Mock analysis:\n- Code structure looks good\n- Consider adding error handling\n- Overall quality: Good\n\nNote: Set ANTHROPIC_API_KEY for real analysis.`;
        break;

      case 'optimize':
        result.code = '// Optimized version (mock)\nfunction optimized() {\n  return "faster code";\n}';
        result.suggestions = ['Use caching', 'Optimize loops', 'Reduce complexity'];
        break;

      case 'review':
        result.suggestions = ['Add type annotations', 'Improve error handling', 'Add documentation'];
        result.explanation = 'Mock code review. Set ANTHROPIC_API_KEY for detailed review.';
        break;

      default:
        result.explanation = 'Mock response. Set ANTHROPIC_API_KEY environment variable.';
    }

    return result;
  }
}
