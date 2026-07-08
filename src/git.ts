import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface GitExtension {
  getAPI(version: 1): GitAPI;
}

export interface GitAPI {
  repositories: Repository[];
}

export interface Repository {
  inputBox: { value: string };
  rootUri: vscode.Uri;
  state: {
    indexChanges: Change[];
    workingTreeChanges: Change[];
  };
  diff(staged?: boolean): Promise<string>;
  diffIndexWithHEAD(): Promise<string>;
}

export interface Change {
  uri: vscode.Uri;
  status: number;
}

export function getRepository(): Repository | undefined {
  const gitExt = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!gitExt?.isActive) {
    return undefined;
  }
  const api = gitExt.exports.getAPI(1);
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const match = api.repositories.find((r) =>
      activeUri.fsPath.startsWith(r.rootUri.fsPath)
    );
    if (match) return match;
  }
  return api.repositories[0];
}

export async function getDiff(cwd: string, staged: boolean): Promise<string> {
  const args = staged ? ['diff', '--staged'] : ['diff'];
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 1024 * 1024 * 5 });
  return stdout;
}

export async function getDiffAgainstBranch(cwd: string, targetBranch: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['diff', `${targetBranch}...HEAD`], {
    cwd,
    maxBuffer: 1024 * 1024 * 5,
  });
  return stdout;
}

export async function getCommitsSinceBranch(cwd: string, targetBranch: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['log', `${targetBranch}..HEAD`, '--pretty=format:%s'], {
    cwd,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  return stdout.trim();
}

export async function getLocalBranches(cwd: string): Promise<string[]> {
  const { stdout } = await execFileAsync('git', ['branch', '--format=%(refname:short)'], { cwd });
  return stdout.split('\n').map((b) => b.trim()).filter(Boolean);
}

export async function stageAll(cwd: string): Promise<void> {
  await execFileAsync('git', ['add', '-A'], { cwd });
}
