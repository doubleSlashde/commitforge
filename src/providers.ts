import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { httpGet, httpPost } from './http';

const execFileAsync = promisify(execFile);

export async function checkClaudeAvailable(): Promise<boolean> {
  try {
    await execFileAsync('claude', ['--version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function checkOllamaAvailable(config: vscode.WorkspaceConfiguration): Promise<boolean> {
  const baseUrl = config.get<string>('ollama.url', '').replace(/\/+$/, '');
  if (!baseUrl) {
    return false;
  }
  try {
    await httpGet(`${baseUrl}/api/tags`);
    return true;
  } catch {
    return false;
  }
}

export async function callClaude(prompt: string): Promise<string> {
  const { stdout } = await execFileAsync('claude', ['-p', prompt], {
    maxBuffer: 1024 * 1024,
    timeout: 60000,
  });
  return stdout;
}

export async function callOllama(prompt: string, config: vscode.WorkspaceConfiguration): Promise<string> {
  const baseUrl = config.get<string>('ollama.url', '').replace(/\/+$/, '');
  const model = config.get<string>('ollama.model', 'qwen3:32b');
  const apiKey = config.get<string>('ollama.apiKey', '');

  const url = `${baseUrl}/v1/chat/completions`;

  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    stream: false,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const responseText = await httpPost(url, headers, body);
  const response = JSON.parse(responseText);

  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from Ollama server');
  }
  return content;
}

export async function callProvider(prompt: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('commitGen');
  const provider = config.get<string>('provider', 'claude');
  return provider === 'ollama'
    ? callOllama(prompt, config)
    : callClaude(prompt);
}

export function getProviderName(): string {
  const config = vscode.workspace.getConfiguration('commitGen');
  return config.get<string>('provider', 'claude') === 'ollama' ? 'Ollama' : 'Claude';
}
