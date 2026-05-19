# AgentX

AgentX is a local desktop assistant built with Electron, React, TypeScript and Vite.

The app is designed around a simple idea: keep the assistant personal, configurable and local-first. Conversations, settings and skill documents live in the Electron user data folder, while the UI stays focused on chatting, managing models and enabling skills.

## Current Capabilities

- Desktop chat interface with local conversation history.
- Multiple OpenAI-compatible model configurations.
- Encrypted API key storage through Electron `safeStorage` when available.
- Editable local skill documents.
- Automatic lightweight search context for time-sensitive prompts.
- Local IPC boundary between the React UI and Electron backend services.

## Architecture

```text
electron/
  main.cjs
  preload.cjs
  services/
    storage.cjs
    conversations.cjs
    crypto.cjs
    llm.cjs
    search.cjs

src/
  components/
  services/
    configService.ts
    conversationService.ts
    llmService.ts
    skillsService.ts
  shared/
    configDefaults.ts
    types.ts
```

React owns presentation and interaction state. Electron owns local filesystem access, encryption, network calls and search integrations. The preload script exposes a small API to keep that boundary explicit.

## Scripts

```bash
npm run start
npm run build
npm run lint
npm run build:electron
```

On Windows PowerShell, if script execution blocks `npm`, use `npm.cmd run <script>`.

## Development Priorities

1. Keep the local-first philosophy: user data should remain transparent and portable.
2. Keep model providers OpenAI-compatible, but avoid hard-coding one provider into the UI.
3. Treat skills as user-authored instructions first; richer automation can build on top later.
4. Keep IPC handlers narrow and typed from the renderer side.
5. Add features only after the chat, settings and persistence loop stays reliable.

## Next Steps

- Add response streaming and cancellation.
- Show search sources in assistant responses.
- Add import/export for skills and settings.
- Add migrations for stored config and conversation data.
- Split Markdown rendering into a lazy chunk to reduce the production bundle size.
