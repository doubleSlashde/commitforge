# CommitForge – AI Commit Message Generator

Generate commit messages with one click using [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code). Click the ✨ button in the Source Control panel — Claude reads your diff and writes the commit message for you.

No chat, no copy-paste, no context switching.

## Why not just use Claude Code in the terminal?

You can — but there are trade-offs most people don't think about:

- **Minimal context, better results.** The plugin sends _only_ the staged diff to Claude — nothing else. No chat history, no open files, no prior conversation. In the terminal, Claude always carries the full session context, which can dilute the prompt and lead to less accurate commit messages.
- **You control what goes in.** Staging lets you precisely select which changes Claude sees. A chat-based "commit everything" approach sends all changes at once — fine for small diffs, but error-prone when you have unrelated changes across files.
- **No prompt needed.** You don't have to formulate a request or hope Claude interprets it correctly. One click, deterministic workflow, always the same quality.
- **No context switching.** You stay in the SCM panel where you already review and stage changes. No terminal, no chat window, no copy-paste.

In short: fewer tokens in, more precise output out. The plugin is designed for people who care about using LLMs efficiently — not just conveniently.

### User Hints — guide the generation with your own input

Type a hint into the commit message input before clicking ✨ — Claude will incorporate it and generate the message based on the diff **and** your hint.

## Features

- **One-click generation** — ✨ button in the SCM title bar
- **Staged-first** — uses staged changes if available, falls back to all changes
- **Conventional Commits** — `feat:`, `fix:`, `refactor:` out of the box
- **User hints** — type context or instructions into the commit input before generating, and Claude will incorporate them (e.g. "JIRA-123" or "refactor auth module")
- **Per-project format** — configure different formats per workspace
- **Custom templates** — define your own commit format (e.g. with Jira ticket IDs)
- **Multi-language** — English or German commit messages

## Usage

1. Make changes to your code
2. (Optional) Stage specific files
3. (Optional) Type a hint into the commit message input to guide the generation (e.g. a ticket ID, keywords, or a short description)
4. Click the ✨ icon in the Source Control title bar
5. Commit message appears in the input field (replaces any previous text) — done

## Requirements

**Option A — Claude Code CLI** (default):
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`npm install -g @anthropic-ai/claude-code`)
- Active Claude account (Team or individual)

**Option B — Ollama Server** (on-premise):
- Access to an Ollama server with OpenAI-compatible API
- No cloud account or API key required

If the selected provider is not available, the ✨ button is grayed out and a status bar warning is shown.

## Configuration

Configure per workspace in `.vscode/settings.json` or globally in VS Code settings:

```json
{
  "commitGen.format": "conventional",
  "commitGen.language": "en"
}
```

### Provider Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `commitGen.provider` | `claude` | AI provider: `claude` or `ollama` |
| `commitGen.ollama.url` | — | Ollama server URL (e.g. `https://ollama.example.com`) |
| `commitGen.ollama.model` | `qwen3:32b` | Model name (freely configurable, e.g. `qwen3-coder:latest`, `codellama:latest`) |
| `commitGen.ollama.apiKey` | — | API key (only if server requires authentication) |

**Ollama example:**
```json
{
  "commitGen.provider": "ollama",
  "commitGen.ollama.url": "https://ollama.example.com",
  "commitGen.ollama.model": "qwen3:32b"
}
```

### Format Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `commitGen.format` | `conventional` | Format: `conventional`, `descriptive`, or `custom` |
| `commitGen.language` | `en` | Language: `en` or `de` |
| `commitGen.maxDiffLines` | `500` | Max diff lines sent to the AI provider (truncated if larger) |
| `commitGen.customTemplate` | — | Custom prompt for `custom` format |

### Format Examples

**Conventional Commits** (default):
```
feat(auth): add certificate renewal endpoint
```

**Descriptive**:
```
Add certificate renewal endpoint

- Implemented automatic renewal when cert reaches 80% lifetime
- Added EST re-enrollment via GlobalSign API
- Updated device status tracking
```

**Custom** — define your own format:
```json
{
  "commitGen.format": "custom",
  "commitGen.customTemplate": "Format: [JIRA-ID] short description. Example: [PROJ-42] fix login redirect"
}
```

## How It Works

1. Reads staged changes via `git diff --staged` (or `git diff` if nothing is staged)
2. Picks up any text already in the commit message input as a user hint
3. Sends the diff + hint to the configured AI provider with a format-specific prompt
4. Writes the response into the SCM input box (replacing any existing text)

The entire diff is sent (up to the configured limit) so the AI has full context for accurate messages.

## Disclaimer

This extension is provided as-is without any warranty. doubleSlash Net-Business GmbH accepts no liability for damages arising from its use. Use at your own risk.

## License

MIT — made by [doubleSlash](https://doubleslash.de)
