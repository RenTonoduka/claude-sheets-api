// メイン Claude Code API エンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { ClaudeWrapper } from '@/lib/claude-wrapper';
import { RateLimiter } from '@/lib/rate-limiter';
import { validateAuth } from '@/lib/auth';
import { ClaudeCodeRequest, ClaudeCodeResponse, ValidationResult } from '@/lib/types';
import { ERROR_CODES, HTTP_STATUS, API_CONFIG } from '@/lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分

// シングルトンインスタンス
const claudeWrapper = new ClaudeWrapper();
const rateLimiter = new RateLimiter();

export async function POST(request: NextRequest): Promise<NextResponse<ClaudeCodeResponse>> {
  const startTime = Date.now();
  const sessionId = request.headers.get('x-session-id') || generateSessionId();

  try {
    console.log(`[${sessionId}] Claude Code API request started`);

    // 認証検証
    const authResult = await validateAuth(request);
    if (!authResult.valid) {
      console.warn(`[${sessionId}] Authentication failed: ${authResult.message}`);
      return NextResponse.json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: authResult.message || 'Invalid authentication'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          sessionId
        }
      }, {
        status: HTTP_STATUS.UNAUTHORIZED,
        headers: getCorsHeaders()
      });
    }

    // レート制限チェック
    const clientId = authResult.clientId || 'anonymous';
    const rateLimitResult = await rateLimiter.check(clientId);
    if (!rateLimitResult.allowed) {
      console.warn(`[${sessionId}] Rate limit exceeded for client: ${clientId}`);
      return NextResponse.json({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: `Rate limit exceeded. Remaining: ${rateLimitResult.remaining}, Reset in: ${Math.ceil(rateLimitResult.resetTime / 1000)}s`
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          sessionId
        }
      }, {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers: getCorsHeaders()
      });
    }

    // リクエストボディ解析・検証
    const body: ClaudeCodeRequest = await request.json();
    const validationResult = validateRequest(body);
    if (!validationResult.valid) {
      console.warn(`[${sessionId}] Request validation failed: ${validationResult.message}`);
      return NextResponse.json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: validationResult.message || 'Invalid request format'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          sessionId
        }
      }, {
        status: HTTP_STATUS.BAD_REQUEST,
        headers: getCorsHeaders()
      });
    }

    console.log(`[${sessionId}] Processing ${body.action} request for language: ${body.language || 'auto-detect'}`);

    // Claude Code 実行
    const result = await claudeWrapper.execute({
      action: body.action,
      prompt: body.prompt,
      language: body.language,
      framework: body.framework,
      options: body.options || {}
    });

    // 成功時のレート制限記録（設定による）
    rateLimiter.recordSuccess(clientId);

    // 成功レスポンス
    const response: ClaudeCodeResponse = {
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
        sessionId
      }
    };

    console.log(`[${sessionId}] Request completed successfully in ${response.metadata.executionTime}ms`);

    return NextResponse.json(response, {
      status: HTTP_STATUS.OK,
      headers: getCorsHeaders()
    });

  } catch (error) {
    console.error(`[${sessionId}] Claude Code API error:`, error);

    const errorResponse: ClaudeCodeResponse = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'An unexpected error occurred'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
        sessionId
      }
    };

    return NextResponse.json(errorResponse, {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: getCorsHeaders()
    });
  }
}

// GET method for health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      'POST /api/claude-code': 'Execute Claude Code operations',
      'GET /api/health': 'Health check'
    }
  }, {
    status: HTTP_STATUS.OK,
    headers: getCorsHeaders()
  });
}

// OPTIONS method for CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: HTTP_STATUS.OK,
    headers: getCorsHeaders()
  });
}

// ヘルパー関数
function getCorsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || 'https://script.google.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID, X-Requested-With, X-GAS-Version',
    'Access-Control-Allow-Credentials': process.env.CORS_CREDENTIALS || 'true',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateRequest(body: unknown): ValidationResult {
  // Type guard
  if (typeof body !== 'object' || body === null) {
    return { valid: false, message: 'Request body must be an object' };
  }

  const req = body as Record<string, unknown>;

  // 必須フィールドチェック
  if (!req.action || !['generate', 'analyze', 'optimize', 'review'].includes(req.action as string)) {
    return { valid: false, message: 'Invalid or missing action. Must be: generate, analyze, optimize, or review' };
  }

  if (!req.prompt || typeof req.prompt !== 'string') {
    return { valid: false, message: 'Prompt is required and must be a string' };
  }

  if (req.prompt.trim().length === 0) {
    return { valid: false, message: 'Prompt cannot be empty' };
  }

  if (req.prompt.length > API_CONFIG.MAX_PROMPT_LENGTH) {
    return { valid: false, message: `Prompt must be under ${API_CONFIG.MAX_PROMPT_LENGTH} characters` };
  }

  // オプションフィールドの検証
  if (req.language && typeof req.language !== 'string') {
    return { valid: false, message: 'Language must be a string' };
  }

  if (req.framework && typeof req.framework !== 'string') {
    return { valid: false, message: 'Framework must be a string' };
  }

  if (req.options) {
    if (typeof req.options !== 'object') {
      return { valid: false, message: 'Options must be an object' };
    }

    const options = req.options as Record<string, unknown>;
    const { includeTests, includeComments, codeStyle, maxTokens } = options;

    if (includeTests !== undefined && typeof includeTests !== 'boolean') {
      return { valid: false, message: 'includeTests must be a boolean' };
    }

    if (includeComments !== undefined && typeof includeComments !== 'boolean') {
      return { valid: false, message: 'includeComments must be a boolean' };
    }

    if (codeStyle && typeof codeStyle === 'string' && !['modern', 'legacy'].includes(codeStyle)) {
      return { valid: false, message: 'codeStyle must be either "modern" or "legacy"' };
    }

    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || maxTokens < 100 || maxTokens > 8192) {
        return { valid: false, message: 'maxTokens must be a number between 100 and 8192' };
      }
    }
  }

  return { valid: true };
}// Build fix
