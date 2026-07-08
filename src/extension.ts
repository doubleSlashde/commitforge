import * as vscode from 'vscode';
import { checkClaudeAvailable, checkOllamaAvailable } from './providers';
import { generateCommitMessage } from './commitMessage';
import { generatePRDescription } from './prDescription';

let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Commit message command
  context.subscriptions.push(
    vscode.commands.registerCommand('commitGen.generate', () => {
      if (!isProviderAvailable(context)) {
        showProviderWarning();
        return;
      }
      generateCommitMessage();
    })
  );

  // PR description command
  context.subscriptions.push(
    vscode.commands.registerCommand('commitGen.generatePR', () => {
      if (!isProviderAvailable(context)) {
        showProviderWarning();
        return;
      }
      generatePRDescription();
    })
  );

  // Check on activation
  checkProviderAvailability(context);

  // Re-check when settings change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('commitGen.provider') ||
          e.affectsConfiguration('commitGen.ollama.url')) {
        checkProviderAvailability(context);
      }
    })
  );
}

function isProviderAvailable(context: vscode.ExtensionContext): boolean {
  return context.globalState.get<boolean>('providerAvailable', false);
}

function showProviderWarning() {
  const config = vscode.workspace.getConfiguration('commitGen');
  const provider = config.get<string>('provider', 'claude');

  if (provider === 'claude') {
    vscode.window.showWarningMessage(
      'Claude Code CLI not found. Install it with: npm install -g @anthropic-ai/claude-code',
      'Open Documentation'
    ).then(choice => {
      if (choice === 'Open Documentation') {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.anthropic.com/en/docs/claude-code'));
      }
    });
  } else {
    const url = config.get<string>('ollama.url', '');
    vscode.window.showWarningMessage(
      url
        ? `Ollama server not reachable at ${url}. Check the URL and your network connection.`
        : 'Ollama URL not configured. Set commitGen.ollama.url in your settings.',
      'Open Settings'
    ).then(choice => {
      if (choice === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'commitGen.ollama');
      }
    });
  }
}

async function checkProviderAvailability(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('commitGen');
  const provider = config.get<string>('provider', 'claude');

  let available = false;

  if (provider === 'claude') {
    available = await checkClaudeAvailable();
  } else if (provider === 'ollama') {
    available = await checkOllamaAvailable(config);
  }

  vscode.commands.executeCommand('setContext', 'commitGen.providerAvailable', available);
  context.globalState.update('providerAvailable', available);
  updateStatusBar(context, provider, available);
}

function updateStatusBar(context: vscode.ExtensionContext, provider: string, available: boolean) {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }

  if (!available) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    if (provider === 'claude') {
      statusBarItem.text = '$(warning) Claude Code CLI not found';
      statusBarItem.tooltip = 'Install Claude Code CLI: npm install -g @anthropic-ai/claude-code';
    } else {
      const url = vscode.workspace.getConfiguration('commitGen').get<string>('ollama.url', '');
      statusBarItem.text = '$(warning) Ollama server not reachable';
      statusBarItem.tooltip = url
        ? `Cannot reach ${url} — check URL and network`
        : 'Set commitGen.ollama.url in settings';
    }
    statusBarItem.command = 'commitGen.generate';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
  }
}

export function deactivate() {}
