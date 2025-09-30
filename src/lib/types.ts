// API リクエスト・レスポンス型定義

export interface ClaudeCodeRequest {
  action: 'generate' | 'analyze' | 'optimize' | 'review';
  prompt: string;
  language?: string;
  framework?: string;
  options?: {
    includeTests?: boolean;
    includeComments?: boolean;
    codeStyle?: 'modern' | 'legacy';
    maxTokens?: number;
  };
}

export interface ClaudeCodeResponse {
  success: boolean;
  data?: ClaudeExecutionResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    executionTime: number;
    sessionId: string;
    tokensUsed?: number;
  };
}

export interface ClaudeExecutionResult {
  code?: string;
  analysis?: string;
  suggestions?: string[];
  explanation?: string;
}

export interface ClaudeExecutionOptions {
  action: 'generate' | 'analyze' | 'optimize' | 'review';
  prompt: string;
  language?: string;
  framework?: string;
  options?: {
    includeTests?: boolean;
    includeComments?: boolean;
    codeStyle?: 'modern' | 'legacy';
    maxTokens?: number;
  };
}

export interface AuthResult {
  valid: boolean;
  clientId?: string;
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}