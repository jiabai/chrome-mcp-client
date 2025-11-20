# Chrome MCP Client

A Chrome DevTools MCP client using the `mcp-use` TypeScript package.

Note: This project is not a Chrome extension. It connects to Chrome via DevTools Protocol through an MCP server launched by `chrome-devtools-mcp`.

## Features

- Launches Chrome with DevTools protocol enabled
- Navigates to a webpage (default: https://www.example.com)
- Uses MCP (Model Coordination Protocol) for AI-powered automation
- Supports LLM integration with SiliconFlow
 - Spawns `chrome-devtools-mcp` via `npx` to bridge MCP and Chrome

## Prerequisites

- Node.js >= 18.0.0
- Chrome browser installed on your system

### Required: start Chrome on port 9222

Before running the project, you must start Chrome with remote debugging enabled on port `9222` using the provided PowerShell script:

```powershell
# In project root (Windows PowerShell)
./scripts/Start-Chrome-9222.ps1
```

If your system blocks script execution, run with execution policy bypass:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/Start-Chrome-9222.ps1
```

Verification (optional): open the following URL in your browser and ensure it returns JSON with `WebSocketDebuggerUrl`:

```
http://127.0.0.1:9222/json/version
```

Notes:
- The default debug port is `9222`. Keep this port free; the client expects `http://127.0.0.1:9222`.
- The script launches an independent Chrome profile (`--user-data-dir`) and won’t affect your normal Chrome profile.
- If the port is occupied, close other processes using `9222` rather than changing the port.

MCP server:
- The client automatically launches `chrome-devtools-mcp` via `npx` and connects to the browser at `http://127.0.0.1:9222` by default.
- Change the target URL with `CHROME_MCP_URL` if needed.

### Startup Flow

```mermaid
flowchart TD
  A[Run Start-Chrome-9222.ps1] --> B{Chrome started?}
  B -- Yes --> C[Open http://127.0.0.1:9222/json/version]
  C --> D{Has WebSocketDebuggerUrl?}
  D -- Yes --> E[Run npm run dev / npm start]
  B -- No --> F[Check Chrome path/permissions/port 9222]
  D -- No --> G[Free 9222 and rerun script]

  classDef node fill:#1f2937,stroke:#9ca3af,color:#ffffff,stroke-width:1px;
  class A,B,C,D,E,F,G node;
```

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev -- "<task instruction>"
```

This will run the project directly from the source files with the specified task instruction.

Example:
```bash
npm run dev -- "Please navigate to https://www.example.com"
```

Use a task file:

```bash
npm run dev -- --file tasks/deepseek-nemovideo-search.json
```

Supported file types: `.json` with `{ "task": "..." }` or plain `.txt`. You can also pass an absolute or relative path.

### Production Mode

1. Build the project:
   ```bash
   npm run build
   ```

2. Run the built project with a task instruction:
   ```bash
   npm start -- "<task instruction>"
   ```

Example:
```bash
npm start -- "Please navigate to https://www.example.com"
```

Or with a task file:

```bash
npm start -- --file tasks/deepseek-nemovideo-search.json
```

## Configuration

The project can be configured using environment variables. Copy the `.env.example` file to `.env` and modify the values as needed:

```bash
cp .env.example .env
```

### Environment Variables

- `SILICONFLOW_API_KEY` or `OPENAI_API_KEY`: API key for LLM provider
- `MODEL_NAME`: Default model name for LLM
- `LLM_BASE_URL`: Base URL for SiliconFlow (default: `https://api.siliconflow.cn/v1`)
- `LLM_MAX_RETRIES`: Max retries for LLM calls (default: `2`)
- `LLM_TIMEOUT`: Timeout for LLM calls in ms (default: `30000`)
- `LOG_LEVEL`: Log level (`error` | `warn` | `info` | `debug`, default: `info`)
- `CHROME_MCP_URL`: Browser DevTools endpoint (default: `http://127.0.0.1:9222`)
- `MCP_LAUNCH_TIMEOUT`: MCP server launch timeout in ms (default: `60000`)
- `MCP_CONNECT_TIMEOUT`: MCP server connect timeout in ms (default: `30000`)
- `AGENT_MAX_STEPS`: Max steps for agent execution (default: `10` in code, overridable)
- `AGENT_TIMEOUT_MS`: Agent run timeout in ms (default: `120000`)
- `MAX_EXECUTION_TIME`: Global hard timeout in ms (default: `120000`)

## Project Structure

```
src/
├── config/          # Configuration files
├── core/            # Core modules
├── llm/             # Language model integration
├── utils/           # Utility functions
└── index.js         # Main entry point
```

Also:
- `scripts/Start-Chrome-9222.ps1` # Launch a separate Chrome instance on port 9222
- `tasks/` # Example task files for `--file`
- `tests/` # Jest tests for config and LLM

## Scripts

- `npm run dev`: Run in development mode
- `npm start`: Run in production mode (after building)
- `npm run build`: Build the project for production
- `npm test`: Run tests
- `npm run lint`: Lint the code
- `npm run format`: Format the code

The MCP server is launched automatically via `npx chrome-devtools-mcp@latest` with `--browserUrl=$CHROME_MCP_URL`.

## Dependencies

- `mcp-use`: TypeScript package for Model Coordination Protocol
- `chrome-devtools-mcp`: Chrome DevTools MCP implementation
- `@langchain/core`: Core LangChain functionality
- `@langchain/openai`: OpenAI integration for LangChain

## License

MIT
## Architecture

```mermaid
flowchart LR
  U[User Task] --> A[ExtendedMCPAgent]
  A --> C[MCPClient]
  C --> S[npx chrome-devtools-mcp]
  S --> D[Chrome DevTools Protocol]
  D --> B[Chrome Browser]

  classDef node fill:#1f2937,stroke:#9ca3af,color:#ffffff,stroke-width:1px;
  class U,A,C,S,D,B node;
```

## Security

- Do not commit API keys to version control. Use `.env` locally.