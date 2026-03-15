# FinDoc AI

AI-powered financial document assistant that uses chain-of-thought reasoning and a custom DSL to answer questions about financial tables — separating LLM reasoning from deterministic arithmetic to avoid calculation hallucinations.

## How It Works

1. You upload or select a financial document (narrative text + data table)
2. Ask questions in natural language ("What was the percentage change in revenue from 2008 to 2009?")
3. The LLM generates a structured **program** — reasoning steps + DSL operations — instead of computing the answer directly
4. A deterministic executor runs the program, ensuring arithmetic is always correct
5. Multi-turn conversation memory lets follow-up questions reference prior results

### The DSL Approach

Instead of trusting an LLM to do math, the system has it write a small program:

```
Reasoning: Revenue was 37,522 in 2008 and 36,853 in 2009. Percentage change = (new - old) / old × 100
Program:   subtract(36853, 37522), divide(#0, 37522), multiply(#1, const_100)
Result:    -1.78%
```

Operations: `add`, `subtract`, `multiply`, `divide`, `greater`, `exp`
Memory references (`#0`, `#1`, ...) chain step results together across turns.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Python, FastAPI, LangChain |
| LLM | Cloudflare Workers AI (Llama 3.1 8B / Llama 3.3 70B) |
| Deployment | Cloudflare Pages (frontend) + Render (backend) |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Cloudflare](https://dash.cloudflare.com/) account (free tier works) with an API token for Workers AI

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Cloudflare credentials
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:8000`.

### Environment Variables

Create `backend/.env` from the example:

```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
ALLOWED_ORIGINS=http://localhost:5173
```

For production, set `VITE_API_URL` when building the frontend to point at your deployed backend URL.

## Project Structure

```
financial-document-assistant/
├── backend/
│   ├── main.py              # FastAPI app, /api/chat endpoint
│   ├── agent.py             # LLM orchestration, prompt construction
│   ├── dsl_executor.py      # Deterministic calculation engine
│   ├── prompts.py           # System prompts and few-shot examples
│   ├── schemas.py           # Pydantic request/response models
│   ├── table_formatter.py   # Table → markdown conversion
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main app, state wiring
│   │   ├── components/
│   │   │   ├── Header.tsx           # Top bar, model selector
│   │   │   ├── HistorySidebar.tsx   # Conversation history
│   │   │   ├── DocumentViewer.tsx   # Document display with zoom
│   │   │   ├── DocumentSelector.tsx # Document picker dropdown
│   │   │   ├── FinancialTable.tsx   # Table rendering
│   │   │   ├── ChatPanel.tsx        # Q&A chat interface
│   │   │   └── UploadModal.tsx      # Document upload (paste/JSON)
│   │   ├── hooks/
│   │   │   ├── useChat.ts           # Chat state + API calls
│   │   │   └── useDocuments.ts      # Document loading + selection
│   │   └── lib/
│   │       ├── api.ts               # HTTP client
│   │       ├── types.ts             # TypeScript interfaces
│   │       └── formatters.ts        # Answer + table formatting
│   └── public/
│       └── data/
│           └── example_records.json # Sample financial documents
│
└── reference/               # Original reference implementation
```

## Features

- **Multi-turn conversations** — ask follow-up questions that reference previous answers via calculation memory
- **Two LLM models** — switch between Llama 3.1 8B (faster) and Llama 3.3 70B (more capable) at runtime
- **Document upload** — paste tab-separated/CSV table data or upload a JSON file
- **5 sample documents** — pre-loaded financial records (JKHY, Republic Services, UPS, Celanese) for immediate testing
- **Answer formatting** — percentages, ratios, integers, and decimals displayed with appropriate formatting
- **Error handling** — inline error messages with retry, loading indicators, graceful network failure handling
- **Privacy-first** — documents are never stored server-side; all data stays in the browser

## Document Format

Documents follow this JSON structure:

```json
{
  "pre_text": "Narrative context before the table...",
  "post_text": "Additional notes after the table...",
  "table": {
    "2009": { "revenue": 36853, "cost": 30049 },
    "2008": { "revenue": 37522, "cost": 30572 }
  }
}
```

The table is a dict-of-dicts: outer keys are columns, inner keys are row labels.

## Deployment

**Frontend** → Cloudflare Pages:
```bash
cd frontend && npm run build
npx wrangler pages deploy dist --project-name findoc-ai
```

**Backend** → Render (or any platform supporting Python):
- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set env vars: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `ALLOWED_ORIGINS`

After deploying both, rebuild the frontend with `VITE_API_URL` set to your backend URL and update `ALLOWED_ORIGINS` on the backend to include your Pages domain.

## Architecture

```
Browser → React Frontend (Vite)
              ↓ POST /api/chat
         FastAPI Backend
              ↓
         Agent (agent.py)
           ├→ Build prompt (system + user context + history)
           ├→ Call Cloudflare Workers AI
           └→ Parse structured LLM response
              ↓
         DSL Executor (dsl_executor.py)
           ├→ Execute program step-by-step
           ├→ Resolve memory references (#0, #1, ...)
           └→ Return formatted result
              ↓
         ChatResponse → Frontend → Display
```

## License

MIT
