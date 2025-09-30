// 認証処理

import { NextRequest } from 'next/server';
import { AuthResult } from './types';
import { SECURITY } from './constants';

export async function validateAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Authorization ヘッダーチェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Missing or invalid Authorization header'
      };
    }

    // APIキー取得・検証
    const apiKey = authHeader.substring(7); // "Bearer " を削除
    if (!apiKey || apiKey !== SECURITY.API_SECRET) {
      return {
        valid: false,
        message: 'Invalid API key'
      };
    }

    // Origin チェック
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (origin && !SECURITY.ALLOWED_ORIGINS.includes(origin)) {
      return {
        valid: false,
        message: 'Origin not allowed'
      };
    }

    if (referer) {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.hostname}`;
      if (!SECURITY.ALLOWED_ORIGINS.includes(refererOrigin)) {
        return {
          valid: false,
          message: 'Referer not allowed'
        };
      }
    }

    // User-Agent チェック（GAS からのリクエストかどうか）
    const userAgent = request.headers.get('user-agent') || '';
    const gasIdentifier = request.headers.get('x-requested-with');

    if (gasIdentifier !== 'GoogleAppsScript' && !userAgent.includes('GoogleAppsScript')) {
      console.warn('Request not identified as from Google Apps Script');
      // 警告のみで、ブロックはしない（開発・テスト用）
    }

    // クライアント ID 生成（IP アドレス + User-Agent のハッシュ）
    const clientId = generateClientId(request);

    return {
      valid: true,
      clientId,
      message: 'Authentication successful'
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      valid: false,
      message: 'Authentication failed'
    };
  }
}

function generateClientId(request: NextRequest): string {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const sessionId = request.headers.get('x-session-id') || '';

  // シンプルなハッシュ生成（本格的な実装では crypto を使用）
  const rawString = `${ip}-${userAgent}-${sessionId}`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit integer に変換
  }

  return `client_${Math.abs(hash).toString(36)}`;
}