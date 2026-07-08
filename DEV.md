# Development Guide

## Prerequisites

- Node.js 20+
- VS Code (for testing the extension)
- **Zum Testen:** Claude Code CLI oder Zugriff auf einen Ollama-Server

## Setup

```bash
npm install
```

## Build & Run

```bash
npm run compile       # TypeScript kompilieren
npm run package       # .vsix Datei erzeugen
```

Zum Testen in VS Code: `F5` öffnet eine Extension Development Host-Instanz.

## Project Structure

```
src/
  extension.ts        # Extension entry point, provider logic, command registration
images/               # Screenshots für README / Marketplace
```

## Public Mirror (GitHub)

Das interne GitLab-Repo ist das Arbeits-Repo. Für den Marketplace gibt es einen öffentlichen
Snapshot-Mirror unter <https://github.com/doubleSlashde/commitforge> — **ohne** die interne
Git-History (alte Commits enthalten interne Screenshots und die GitLab-URL).

Der Mirror wird pro Release als frischer Snapshot aktualisiert:

```bash
# Snapshot des aktuellen HEAD ohne History erzeugen und pushen
git archive HEAD | tar -x -C /tmp/commitforge-snapshot
cd /tmp/commitforge-snapshot
git init -b main
git add -A
git commit -m "release: v<version>"
git remote add origin git@github.com:doubleSlashde/commitforge.git
git push --force origin main
```

**Wichtig:** Keine internen Repo-Namen, Kundendaten oder internen URLs in Screenshots,
README oder Code-Kommentaren — alles in diesem Repo kann öffentlich werden.

## CI/CD

Die Pipeline ist in `.gitlab-ci.yml` definiert und hat zwei Stages:

| Stage     | Trigger                        | Was passiert                                      |
|-----------|--------------------------------|---------------------------------------------------|
| `build`   | Push auf `main` oder Tag       | `npm ci` → TypeScript compile → `.vsix` erzeugen  |
| `release` | Nur bei Tags (`v*.*.*`)        | GitLab Release mit `.vsix` als Download-Asset      |

### Release erstellen

1. Version in `package.json` anpassen
2. Committen und pushen
3. Tag erstellen und pushen:

```bash
git tag v1.1.0
git push origin v1.1.0
```

Die Pipeline baut die `.vsix` und erstellt automatisch ein GitLab Release mit Download-Link.

**Wichtig:** Der Tag muss dem Pattern `v<major>.<minor>.<patch>` entsprechen (z.B. `v1.0.0`, `v2.3.1`), sonst wird kein Release erstellt.

## Configuration (Extension Settings)

### Provider

| Setting                    | Default        | Beschreibung                                  |
|----------------------------|----------------|-----------------------------------------------|
| `commitGen.provider`       | `claude`       | `claude` oder `ollama`                        |
| `commitGen.ollama.url`     | —              | Ollama-Server-URL (z.B. `https://ollama.example.com`) |
| `commitGen.ollama.model`   | `qwen3:32b`   | Modellname (frei wählbar, z.B. `qwen3-coder:latest`, `codellama:latest`) |
| `commitGen.ollama.apiKey`  | —              | API-Key (nur wenn Server Auth erfordert)      |

### Format

| Setting                    | Default        | Beschreibung                                  |
|----------------------------|----------------|-----------------------------------------------|
| `commitGen.format`         | `conventional` | `conventional`, `descriptive`, oder `custom`  |
| `commitGen.language`       | `en`           | `en` oder `de`                                |
| `commitGen.maxDiffLines`   | `500`          | Max. Diff-Zeilen die an den Provider gesendet werden |
| `commitGen.customTemplate` | —              | Eigenes Prompt-Template für `custom` Format   |

### Ollama-Beispielkonfiguration

```json
{
  "commitGen.provider": "ollama",
  "commitGen.ollama.url": "https://ollama.example.com",
  "commitGen.ollama.model": "qwen3:32b"
}
```

Das Modell ist frei wählbar — der Server muss es lediglich installiert haben. Verfügbare Modelle kann man per `curl -sk <server-url>/api/tags | jq '.models[].name'` abfragen.
