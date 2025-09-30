// Claude CLI ラッパー実装

import { spawn } from 'child_process';
import { writeFile, mkdtemp, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ClaudeExecutionOptions, ClaudeExecutionResult } from './types';
import { CLAUDE_CONFIG } from './constants';

export class ClaudeWrapper {
  private timeout: number;
  private maxRetries: number;
  private model: string;

  constructor() {
    this.timeout = CLAUDE_CONFIG.TIMEOUT;
    this.maxRetries = CLAUDE_CONFIG.MAX_RETRIES;
    this.model = CLAUDE_CONFIG.MODEL;
  }

  async execute(options: ClaudeExecutionOptions): Promise<ClaudeExecutionResult> {
    let tempDir: string | null = null;

    try {
      // 一時ディレクトリ作成
      tempDir = await mkdtemp(join(tmpdir(), 'claude-'));
      const inputFile = join(tempDir, 'input.txt');

      // プロンプトファイル作成
      const formattedPrompt = this.formatPrompt(options);
      await writeFile(inputFile, formattedPrompt, 'utf-8');

      // Claude コマンド構築・実行
      const { command, fullPrompt } = await this.buildCommandAndPrompt(options.action, inputFile);
      const output = await this.executeWithRetry(command, fullPrompt);

      // 結果解析
      return this.parseOutput(output, options.action);

    } finally {
      // 一時ディレクトリクリーンアップ
      if (tempDir) {
        try {
          await this.cleanupTempDir(tempDir);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp directory:', tempDir, cleanupError);
        }
      }
    }
  }

  private formatPrompt(options: ClaudeExecutionOptions): string {
    let prompt = options.prompt;

    // メタデータ追加
    const metadata: string[] = [];
    if (options.language) metadata.push(`Language: ${options.language}`);
    if (options.framework) metadata.push(`Framework: ${options.framework}`);

    if (metadata.length > 0) {
      prompt = metadata.join('\n') + '\n\n' + prompt;
    }

    // オプション指示追加
    const instructions: string[] = [];
    if (options.options?.includeTests) {
      instructions.push('Please include unit tests.');
    }
    if (options.options?.includeComments) {
      instructions.push('Please include detailed comments.');
    }
    if (options.options?.codeStyle === 'modern') {
      instructions.push('Use modern language features and best practices.');
    }

    if (instructions.length > 0) {
      prompt += '\n\n' + instructions.join('\n');
    }

    return prompt;
  }

  private async buildCommandAndPrompt(action: string, inputFile: string): Promise<{ command: string; fullPrompt: string }> {
    // ファイル内容を読み込み
    const fileContent = await readFile(inputFile, 'utf-8');

    // アクション別プロンプト
    const actionPrompts = {
      generate: 'Generate code based on the following requirements:',
      analyze: 'Analyze the following code and provide insights:',
      optimize: 'Optimize the following code for better performance and readability:',
      review: 'Review the following code and provide feedback:'
    };

    const actionPrompt = actionPrompts[action as keyof typeof actionPrompts] || actionPrompts.generate;

    // フルプロンプトを構築
    const fullPrompt = `${actionPrompt}\n\n${fileContent}`;

    // シンプルなコマンド構築（プロンプトは後で stdin で渡す）
    return {
      command: 'claude --print',
      fullPrompt
    };
  }

  private async executeWithRetry(command: string, prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Executing Claude command (attempt ${attempt}): ${command}`);
        console.log(`Prompt length: ${prompt.length} characters`);

        const output = await this.executeClaude(command, prompt);
        return output;

      } catch (error) {
        lastError = error as Error;
        console.error(`Claude CLI attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          // 指数バックオフで待機
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(`Claude CLI failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  private async executeClaude(command: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = command.split(' ').slice(1); // Remove 'claude' from command
      const child = spawn('claude', args, {
        env: {
          ...process.env,
          CLAUDE_AUTH_METHOD: CLAUDE_CONFIG.AUTH_METHOD,
          // ホームディレクトリを明示的に設定
          HOME: process.env.HOME || '/Users/tonodukaren'
        }
      });

      let stdout = '';
      let stderr = '';

      // タイムアウト設定
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Claude CLI timed out after ${this.timeout}ms`));
      }, this.timeout);

      // stdout収集
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // stderr収集
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // プロセス終了処理
      child.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          if (stderr && !stderr.toLowerCase().includes('warning')) {
            console.warn('Claude CLI stderr:', stderr);
          }
          resolve(stdout);
        } else {
          reject(new Error(`Claude CLI exited with code ${code}. stderr: ${stderr}`));
        }
      });

      // エラー処理
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // プロンプトをstdinに送信
      if (child.stdin) {
        child.stdin.write(prompt);
        child.stdin.end();
      } else {
        reject(new Error('Failed to access stdin of Claude process'));
      }
    });
  }

  private parseOutput(output: string, action: string): ClaudeExecutionResult {
    const result: ClaudeExecutionResult = {};

    // コードブロック抽出
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const codeBlocks: string[] = [];
    let match;

    while ((match = codeBlockRegex.exec(output)) !== null) {
      codeBlocks.push(match[1]);
    }

    // アクション別結果処理
    switch (action) {
      case 'generate':
        if (codeBlocks.length > 0) {
          result.code = codeBlocks[0];
        }
        result.explanation = this.extractExplanation(output);
        break;

      case 'analyze':
        result.analysis = this.extractAnalysis(output);
        result.suggestions = this.extractSuggestions(output);
        break;

      case 'optimize':
        if (codeBlocks.length > 0) {
          result.code = codeBlocks[0];
        }
        result.suggestions = this.extractOptimizations(output);
        break;

      case 'review':
        result.analysis = this.extractReview(output);
        result.suggestions = this.extractIssues(output);
        break;
    }

    // フォールバック: コードが見つからない場合はテキスト全体を説明として使用
    if (!result.code && !result.analysis && !result.explanation) {
      result.explanation = output;
    }

    return result;
  }

  private extractExplanation(output: string): string {
    const lines = output.split('\n');
    const explanationLines = lines.filter(line =>
      !line.startsWith('```') &&
      line.trim() !== '' &&
      !line.match(/^(Language|Framework):/i)
    );
    return explanationLines.join('\n').trim();
  }

  private extractAnalysis(output: string): string {
    return this.extractSection(output, ['analysis', 'review', 'assessment']);
  }

  private extractSuggestions(output: string): string[] {
    const suggestions: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
        suggestions.push(line.replace(/^[-*\d.]\s+/, '').trim());
      }
    }

    return suggestions.length > 0 ? suggestions : [this.extractSection(output, ['suggestions', 'recommendations'])];
  }

  private extractOptimizations(output: string): string[] {
    return this.extractSuggestions(output);
  }

  private extractReview(output: string): string {
    return this.extractSection(output, ['review', 'feedback', 'assessment']);
  }

  private extractIssues(output: string): string[] {
    return this.extractSuggestions(output);
  }

  private extractSection(output: string, keywords: string[]): string {
    const lines = output.split('\n');
    let sectionStart = -1;

    // キーワードでセクション開始を探す
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        sectionStart = i;
        break;
      }
    }

    if (sectionStart >= 0) {
      return lines.slice(sectionStart).join('\n').trim();
    }

    // キーワードが見つからない場合は全体を返す
    return output.trim();
  }

  private async cleanupTempDir(tempDir: string): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync(`rm -rf "${tempDir}"`);
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }
}