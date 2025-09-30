// ヘルスチェック API エンドポイント

import { NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/lib/constants';

export async function GET(): Promise<NextResponse> {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      'claude-cli': await checkClaudeService(),
      'rate-limiter': 'operational',
      'auth': 'operational'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage()
    }
  };

  return NextResponse.json(healthData, {
    status: HTTP_STATUS.OK,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

async function checkClaudeService(): Promise<string> {
  try {
    // Claude CLI の簡単な可用性チェック
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    await execAsync('which claude', { timeout: 5000 });
    return 'available';
  } catch (error) {
    console.warn('Claude CLI not available:', error);
    return 'unavailable';
  }
}