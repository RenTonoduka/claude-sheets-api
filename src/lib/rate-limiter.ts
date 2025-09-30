// レート制限実装

import { RateLimitResult } from './types';
import { RATE_LIMITS } from './constants';

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private skipSuccessfulRequests: boolean;

  constructor() {
    this.windowMs = RATE_LIMITS.WINDOW_MS;
    this.maxRequests = RATE_LIMITS.MAX_REQUESTS;
    this.skipSuccessfulRequests = RATE_LIMITS.SKIP_SUCCESS;

    // 定期的なクリーンアップ（メモリリーク防止）
    setInterval(() => this.cleanup(), this.windowMs);
  }

  async check(clientId: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // クライアントのリクエスト履歴を取得
    let clientRequests = this.requests.get(clientId) || [];

    // ウィンドウ外のリクエストを削除
    clientRequests = clientRequests.filter(timestamp => timestamp > windowStart);

    // レート制限チェック
    if (clientRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...clientRequests);
      const resetTime = oldestRequest + this.windowMs - now;

      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.max(resetTime, 0)
      };
    }

    // リクエストを記録
    clientRequests.push(now);
    this.requests.set(clientId, clientRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - clientRequests.length,
      resetTime: this.windowMs
    };
  }

  // 成功したリクエストの記録（オプション）
  recordSuccess(clientId: string): void {
    if (this.skipSuccessfulRequests) {
      // 成功したリクエストはカウントしない設定の場合
      const clientRequests = this.requests.get(clientId) || [];
      if (clientRequests.length > 0) {
        clientRequests.pop(); // 最後のリクエストを削除
        this.requests.set(clientId, clientRequests);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);

      if (validRequests.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, validRequests);
      }
    }

    // メモリ使用量をログ出力（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log(`Rate limiter cleanup: ${this.requests.size} active clients`);
    }
  }

  // 統計情報取得（監視用）
  getStats(): { activeClients: number; totalRequests: number } {
    let totalRequests = 0;
    for (const requests of this.requests.values()) {
      totalRequests += requests.length;
    }

    return {
      activeClients: this.requests.size,
      totalRequests
    };
  }
}