import * as vscode from 'vscode';
import { getRepository, getDiffAgainstBranch, getCommitsSinceBranch, getCurrentBranch, getLocalBranches } from './git';
import { callProvider, getProviderName } from './providers';

export async function generatePRDescription() {
  const repo = getRepository();
  if (!repo) {
    vscode.window.showWarningMessage('Kein Git-Repository gefunden.');
    return;
  }

  const config = vscode.workspace.getConfiguration('commitGen');
  const language = config.get<string>('language', 'en');
  const maxLines = config.get<number>('maxDiffLines', 500);
  const defaultTarget = config.get<string>('pr.targetBranch', 'main');
  const cwd = repo.rootUri.fsPath;

  // Check: not on target branch
  let currentBranch: string;
  try {
    currentBranch = await getCurrentBranch(cwd);
  } catch {
    vscode.window.showErrorMessage('Could not determine current branch.');
    return;
  }

  // Let user pick target branch
  let branches: string[];
  try {
    branches = await getLocalBranches(cwd);
  } catch {
    branches = [defaultTarget];
  }

  // Filter out current branch and sort: default first, then alphabetical
  const otherBranches = branches
    .filter((b) => b !== currentBranch)
    .sort((a, b) => {
      if (a === defaultTarget) return -1;
      if (b === defaultTarget) return 1;
      return a.localeCompare(b);
    });

  if (otherBranches.length === 0) {
    vscode.window.showWarningMessage('No other branches found to compare against.');
    return;
  }

  const targetBranch = await vscode.window.showQuickPick(otherBranches, {
    placeHolder: `Select target branch (current: ${currentBranch})`,
    title: 'PR Target Branch',
  });

  if (!targetBranch) {
    return; // user cancelled
  }

  // Get commits and diff against target branch
  let commits: string;
  let diff: string;

  try {
    [commits, diff] = await Promise.all([
      getCommitsSinceBranch(cwd, targetBranch),
      getDiffAgainstBranch(cwd, targetBranch),
    ]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Git Fehler: ${msg}`);
    return;
  }

  if (!commits.trim() && !diff.trim()) {
    vscode.window.showInformationMessage(`No changes found compared to "${targetBranch}".`);
    return;
  }

  // Truncate diff if needed
  const lines = diff.split('\n');
  const diffText = lines.length > maxLines
    ? lines.slice(0, maxLines).join('\n') + `\n\n[... ${lines.length - maxLines} lines truncated]`
    : diff;

  const prompt = buildPRPrompt(currentBranch, targetBranch, commits, diffText, language);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating PR description...',
      cancellable: false,
    },
    async () => {
      try {
        const description = await callProvider(prompt);
        await showPRDescription(description.trim(), currentBranch, targetBranch);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`${getProviderName()} Fehler: ${errorMsg}`);
      }
    }
  );
}

async function showPRDescription(description: string, branch: string, target: string) {
  const doc = await vscode.workspace.openTextDocument({
    content: description,
    language: 'markdown',
  });
  await vscode.window.showTextDocument(doc, { preview: true });

  const choice = await vscode.window.showInformationMessage(
    `PR description generated (${branch} → ${target})`,
    'Copy to Clipboard'
  );
  if (choice === 'Copy to Clipboard') {
    await vscode.env.clipboard.writeText(description);
    vscode.window.showInformationMessage('PR description copied to clipboard.');
  }
}

function buildPRPrompt(
  currentBranch: string,
  targetBranch: string,
  commits: string,
  diff: string,
  language: string
): string {
  const lang = language === 'de'
    ? 'Schreibe die PR-Beschreibung auf Deutsch.'
    : 'Write the PR description in English.';

  return `You are a pull request description generator. Generate a structured PR description in Markdown format.

${lang}

Branch: ${currentBranch} → ${targetBranch}

Output format:
## Title
<A concise PR title, max 70 characters>

## Summary
<2-4 bullet points describing the key changes>

## Changes
<Detailed list of what was changed and why, grouped by topic>

## Test Plan
<Checklist of items to verify, as markdown checkboxes>

Rules:
- Be specific and reference actual file/component names from the diff
- Focus on the "why" not just the "what"
- Keep the title short and descriptive
- No code fences around the entire output
- Output ONLY the PR description, nothing else

--- COMMITS ---
${commits}
--- END COMMITS ---

--- DIFF ---
${diff}
--- END DIFF ---`;
}
