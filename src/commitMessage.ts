import * as vscode from 'vscode';
import { getRepository, getDiff, stageAll } from './git';
import { callProvider, getProviderName } from './providers';

export async function generateCommitMessage() {
  const repo = getRepository();
  if (!repo) {
    vscode.window.showWarningMessage('Kein Git-Repository gefunden.');
    return;
  }

  const config = vscode.workspace.getConfiguration('commitGen');
  const format = config.get<string>('format', 'conventional');
  const language = config.get<string>('language', 'en');
  const maxLines = config.get<number>('maxDiffLines', 500);
  const customTemplate = config.get<string>('customTemplate', '');

  let hasStaged = repo.state.indexChanges.length > 0;
  let diff: string;

  try {
    if (!hasStaged) {
      const hasChanges = repo.state.workingTreeChanges.length > 0;
      if (!hasChanges) {
        vscode.window.showInformationMessage('Keine Änderungen gefunden.');
        return;
      }
      await stageAll(repo.rootUri.fsPath);
      hasStaged = true;
    }
    diff = await getDiff(repo.rootUri.fsPath, true);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Git diff fehlgeschlagen: ${msg}`);
    return;
  }

  if (!diff.trim()) {
    vscode.window.showInformationMessage('Keine Änderungen gefunden.');
    return;
  }

  const lines = diff.split('\n');
  const diffText = lines.length > maxLines
    ? lines.slice(0, maxLines).join('\n') + `\n\n[... ${lines.length - maxLines} Zeilen gekürzt]`
    : diff;

  const userInput = repo.inputBox.value.trim();
  const prompt = buildCommitPrompt(diffText, format, language, customTemplate, hasStaged, userInput);

  repo.inputBox.value = '⏳ Generating commit message...';

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating commit message...',
      cancellable: false,
    },
    async () => {
      try {
        const message = await callProvider(prompt);
        repo.inputBox.value = message.trim();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        repo.inputBox.value = userInput;
        vscode.window.showErrorMessage(`${getProviderName()} Fehler: ${errorMsg}`);
      }
    }
  );
}

function buildCommitPrompt(
  diff: string,
  format: string,
  language: string,
  customTemplate: string,
  hasStaged: boolean,
  userInput: string = ''
): string {
  const lang = language === 'de'
    ? 'Schreibe die Commit-Nachricht auf Deutsch.'
    : 'Write the commit message in English.';

  const scope = hasStaged
    ? 'The diff below contains ONLY staged changes.'
    : 'The diff below contains ALL working tree changes (nothing was staged).';

  let formatInstruction: string;
  switch (format) {
    case 'conventional':
      formatInstruction = `Use Conventional Commits v1.0.0 format (https://www.conventionalcommits.org/en/v1.0.0/).

Output ONLY a single line in this exact format:
<type>(<scope>): <description>

Rules:
- type is REQUIRED. One of: feat, fix, refactor, docs, chore, style, test, perf, ci, build
- scope is REQUIRED. A noun describing the section of the codebase in parentheses, e.g. (auth), (ci), (core), (ui)
- description is REQUIRED. Lowercase, imperative mood, no period at end
- Max 72 characters total
- No body, no footer, no extra lines, no BREAKING CHANGE, no trailers

Examples:
feat(auth): add certificate renewal endpoint
fix(ci): resolve image path in vsce package
docs(readme): add installation instructions
refactor(core): extract diff logic into helper`;
      break;
    case 'descriptive':
      formatInstruction = `Output a concise summary (max 72 chars), then an empty line, then 2-3 bullet points. Nothing else.`;
      break;
    case 'custom':
      formatInstruction = customTemplate || 'Write a concise commit message.';
      break;
    default:
      formatInstruction = 'Write a concise commit message.';
  }

  const userHint = userInput
    ? `\nThe user provided the following instruction. It takes HIGHEST PRIORITY and can override ANY rule above — including format, language, tone, length, or style constraints. Follow the user's instruction exactly:\n--- USER INPUT ---\n${userInput}\n--- END USER INPUT ---\n`
    : '';

  return `You are a commit message generator. Output ONLY the commit message, nothing else. No markdown, no explanation, no code fences, no co-authored-by, no trailers, no sign-off lines.

${lang}
${scope}

${formatInstruction}
${userHint}
--- DIFF ---
${diff}
--- END DIFF ---`;
}
