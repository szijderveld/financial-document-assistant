# Build Plan — FinDoc AI

This plan is designed to be executed step-by-step using Claude Code. Each step has a prompt you can pass directly. Use the `/project:plan-step` command to execute the next unchecked step automatically.

**Architecture:** React + Vite frontend (Cloudflare Pages) | Python FastAPI + LangChain backend (Render free tier) | Cloudflare Workers AI (Llama models, free)

### Mode Guide

Each step is marked with the recommended Claude mode:

- **`⚡ Execute`** — Run in **regular mode**. The step is straightforward — just paste the prompt and let Claude build it.
- **`🧠 Plan → Execute`** — Start in **Plan mode** to think through the approach first (architecture, edge cases, file structure). Once the plan looks good, exit Plan mode and execute.

| Step | Mode | Why |
|------|------|-----|
| 1 | ⚡ Execute | Boilerplate scaffolding |
| 2 | ⚡ Execute | Standard FastAPI setup |
| 3 | ⚡ Execute | Small utility, clear reference |
| 4 | 🧠 Plan → Execute | Core agent logic — prompt engineering, LangChain wiring, needs design thought |
| 5 | ⚡ Execute | Simple endpoint wiring |
| 6 | ⚡ Execute | Type definitions from spec |
| 7 | ⚡ Execute | CSS extraction from prototype |
| 8 | ⚡ Execute | Standard layout + component |
| 9 | ⚡ Execute | Single component build |
| 10 | ⚡ Execute | Two small components |
| 11 | ⚡ Execute | Single component, clear spec |
| 12 | 🧠 Plan → Execute | Most complex component — chat UX, messages, input handling, many states |
| 13 | ⚡ Execute | Hook with clear data flow |
| 14 | ⚡ Execute | API client + hook |
| 15 | 🧠 Plan → Execute | Integration step — wiring many components, state flow between them |
| 16 | ⚡ Execute | Modal with clear spec |
| 17 | ⚡ Execute | Small utility functions |
| 18 | 🧠 Plan → Execute | Touches many files — error states, loading, responsive tweaks across the app |
| 19 | ⚡ Execute | Testing and bug fixes |
| 20 | ⚡ Execute | Config files and build verification |
| 21 | ⚡ Execute | Deployment commands |

---

## Phase 1: Project Scaffolding

### Step 1: Initialize the monorepo with frontend and backend directories ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Set up the project structure with separate frontend/ and backend/ directories. Do NOT create a new top-level directory — work inside the existing financial-document-assistant/ root.

1. Create `backend/` directory with these files:
   - `backend/requirements.txt`:
     ```
     fastapi==0.115.0
     uvicorn[standard]==0.30.6
     langchain-community==0.3.0
     langchain-core==0.3.0
     pydantic==2.9.0
     python-dotenv==1.0.1
     httpx==0.27.2
     ```
   - `backend/.env.example`:
     ```
     CLOUDFLARE_ACCOUNT_ID=your_account_id
     CLOUDFLARE_API_TOKEN=your_api_token
     ALLOWED_ORIGINS=http://localhost:5173
     ```
   - `backend/main.py`: empty placeholder with `# FastAPI app`

2. Create `frontend/` directory:
   - Run `npm create vite@latest frontend -- --template react-ts` from the project root
   - `cd frontend && npm install`
   - Verify `npm run dev` starts (then kill it)

3. Update the root `.gitignore` to include:
   ```
   node_modules/
   dist/
   __pycache__/
   *.pyc
   .env
   .venv/
   venv/
   *.local
   .wrangler/
   ```

4. Copy sample data: `mkdir -p frontend/public/data && cp reference/data/example_records.json frontend/public/data/`

5. Commit: "feat: initialize monorepo with frontend and backend directories"

Do NOT modify any files in the `reference/` directory.
```

### Step 2: Set up the Python backend with FastAPI ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the FastAPI backend skeleton with CORS and health check.

1. Create `backend/main.py`:
   ```python
   import os
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware
   from dotenv import load_dotenv

   load_dotenv()

   app = FastAPI(title="FinDoc AI API", version="1.0.0")

   # CORS — allow frontend origins
   allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
   app.add_middleware(
       CORSMiddleware,
       allow_origins=allowed_origins,
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   @app.get("/api/health")
   async def health():
       return {"status": "ok"}
   ```

2. Create `backend/schemas.py` with Pydantic models:
   ```python
   from pydantic import BaseModel

   class Document(BaseModel):
       pre_text: str
       post_text: str
       table: dict[str, dict[str, float | str | int]]

   class ConversationEntry(BaseModel):
       question: str
       answer: str

   class ChatRequest(BaseModel):
       document: Document
       conversation_history: list[ConversationEntry] = []
       question: str
       model: str = "llama-3.1-8b"

   class ChatResponse(BaseModel):
       answer: str
       model: str
   ```

3. Test: `cd backend && pip install -r requirements.txt && uvicorn main:app --port 8000` — verify /api/health returns OK (then kill it)

4. Commit: "feat: set up FastAPI backend with CORS and health check"
```

---

## Phase 2: Backend Agent (Python + LangChain)

### Step 3: Build the table formatter utility ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Create the table formatting utility, ported from reference/src/agents/base.py.

1. Create `backend/table_formatter.py`:
   - Port the `_format_table()` method from `reference/src/agents/base.py`
   - The function takes `table: dict[str, dict[str, float | str | int]]` and returns a markdown string
   - Columns are the outer dict keys, rows are the inner dict keys
   - Output format: markdown table with headers and aligned data
   - Read the reference implementation first, then rewrite it cleanly (do NOT copy-paste)

2. Add a simple test at the bottom of the file:
   ```python
   if __name__ == "__main__":
       test_table = {
           "2009": {"sales": 36853, "cost": 30049},
           "2008": {"sales": 37522, "cost": 30572}
       }
       print(format_table(test_table))
   ```

3. Run the test: `cd backend && python table_formatter.py` — verify the output looks like a proper markdown table

4. Commit: "feat: build table formatter utility ported from reference"
```

### Step 4: Build the LangChain agent with Cloudflare Workers AI 🧠 Plan → Execute
- [x] **DONE**

**Prompt:**
```
Build the LangChain agent that calls Cloudflare Workers AI. This is the core intelligence of the app.

1. Read `reference/src/agents/direct_prompt_agent/cot_dsl_agent.py` and `reference/src/agents/base.py` for inspiration. Do NOT copy them directly — rebuild the logic cleanly.

2. Create `backend/agent.py`:
   - Import `ChatCloudflareWorkersAI` from `langchain_community.chat_models`
   - Import `SystemMessage, HumanMessage` from `langchain_core.messages`
   - Import `format_table` from `table_formatter`

   - Map model names to Cloudflare model IDs:
     ```python
     MODEL_MAP = {
         "llama-3.1-8b": "@cf/meta/llama-3.1-8b-instruct",
         "llama-3.3-70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
     }
     ```

   - Create an `async def get_answer(document, conversation_history, question, model_name)` function that:
     a. Instantiates `ChatCloudflareWorkersAI` with the model ID, account_id, and api_token from env vars
     b. Builds the **system prompt** — port from the reference's DirectPromptAgent (financial analyst instructions, output format rules, percentage/number formatting)
     c. Builds the **user prompt** — port from reference: includes pre_text, formatted table, post_text, conversation history as Q1/A1 pairs, current question, and calculation instructions
     d. Calls `llm.ainvoke([system_message, human_message])`
     e. Returns the stripped answer string

   - The system prompt should include all the "CRITICAL INSTRUCTIONS" from the reference: only numerical answer, percentage rounding, no explanations, etc.

   - The user prompt should include all context: document text, table, history, question, and calculation instructions.

3. Test the agent manually if you have Cloudflare credentials, otherwise just verify it imports cleanly:
   ```python
   cd backend && python -c "from agent import get_answer; print('Import OK')"
   ```

4. Commit: "feat: build LangChain agent with Cloudflare Workers AI"
```

### Step 5: Wire the /api/chat endpoint ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Connect the agent to the FastAPI chat endpoint.

1. Update `backend/main.py` to add the POST /api/chat route:
   ```python
   from schemas import ChatRequest, ChatResponse
   from agent import get_answer

   @app.post("/api/chat", response_model=ChatResponse)
   async def chat(request: ChatRequest):
       try:
           answer = await get_answer(
               document=request.document,
               conversation_history=request.conversation_history,
               question=request.question,
               model_name=request.model,
           )
           return ChatResponse(answer=answer, model=request.model)
       except Exception as e:
           raise HTTPException(status_code=500, detail=str(e))
   ```

2. Add the HTTPException import from fastapi

3. Test with curl (if you have .env configured):
   ```bash
   cd backend
   uvicorn main:app --port 8000 &
   curl -X POST http://localhost:8000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"document":{"pre_text":"Sales were 100 in 2009","post_text":"","table":{"2009":{"sales":100},"2008":{"sales":90}}},"conversation_history":[],"question":"What were sales in 2009?","model":"llama-3.1-8b"}'
   ```
   If no credentials, just verify the server starts without import errors.

4. Commit: "feat: wire /api/chat endpoint to LangChain agent"
```

---

## Phase 3: Frontend Types & Styles

### Step 6: Set up TypeScript types ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Create the TypeScript type definitions for the frontend.

1. Create `frontend/src/lib/types.ts` with all interfaces needed:

   - `FinancialDocument` — matches backend's Document (pre_text, post_text, table)
   - `Dialogue` — conv_questions, conv_answers, turn_program, executed_answers, qa_split
   - `DocumentFeatures` — num_dialogue_turns, has_type2_question, has_duplicate_columns, has_non_numeric_values
   - `ConvFinQARecord` — id, doc, dialogue, features
   - `ExampleRecords` — { examples: ConvFinQARecord[] }
   - `ChatMessage` — { role: 'user' | 'assistant', content: string, timestamp: Date }
   - `ConversationHistoryEntry` — { question: string, answer: string }
   - `ChatRequest` — { document, conversation_history, question, model }
   - `ChatResponse` — { answer: string, model: string }
   - `SampleDocument` — { id, label, shortLabel, description, record: ConvFinQARecord }
   - `ConversationItem` — { id, name, preview, date }

2. Commit: "feat: add TypeScript type definitions"
```

### Step 7: Set up global styles inspired by the prototype ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Create global CSS styles inspired by the prototype-v2.html design.

1. Read the CSS custom properties and overall style from `prototype-v2.html`

2. Create `frontend/src/styles/index.css` with:
   - Google Fonts import (Inter + JetBrains Mono)
   - CSS custom properties block inspired by the prototype: indigo accent (#4f46e5), background grays, text colors, border colors, spacing, radius, shadows, typography scale
   - CSS reset (box-sizing, margin, padding)
   - Base html/body styles
   - App shell layout classes (three-column flexbox)
   - Scrollbar styling
   - Animation keyframes for chat messages and typing indicator
   - Responsive breakpoints (sidebar collapses ~960px, chat stacks ~768px)

3. Import the CSS in `frontend/src/main.tsx`

4. Verify `npm run dev` works in the frontend directory

5. Commit: "feat: add global styles and design tokens inspired by prototype"

NOTE: The goal is to capture the same general look and feel — indigo accent, professional light theme, Inter font — NOT pixel-perfect reproduction. Use the prototype as a style guide.
```

---

## Phase 4: React Components

### Step 8: Build the App layout shell and Header ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the app layout and Header component.

1. Update `frontend/src/App.tsx` to render the three-column layout:
   - Header (full width, top)
   - Main area: HistorySidebar (left) | DocumentViewer (center) | ChatPanel (right)
   - Use empty placeholder divs for the three panels for now

2. Create `frontend/src/components/Header.tsx`:
   - Left: Logo (indigo square with document icon + "FinDoc AI" text), separator, document title
   - Right: Model selector pill (green dot + model name + chevron), Upload button, Avatar "SZ"
   - Props: documentTitle, selectedModel, onModelChange, onUpload
   - Style it to generally match the prototype header (indigo accent, clean, professional)

3. Add CSS for header and layout to index.css

4. Verify it renders: `cd frontend && npm run dev`

5. Commit: "feat: build app layout shell and Header component"

Use the prototype as a general style guide — same color palette and layout, but don't obsess over exact pixel values.
```

### Step 9: Build the HistorySidebar component ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the HistorySidebar component.

1. Create `frontend/src/components/HistorySidebar.tsx`:
   - Header: "CONVERSATIONS" title + "New" button
   - Search input with magnifying glass icon
   - Chat list with date groups and conversation items
   - Each item: small icon, name, preview text
   - Hover shows rename/delete action buttons
   - Bottom: privacy badge ("Documents stay private — never stored server-side")
   - Collapsible via `collapsed` prop (width transitions to 0)
   - Props: collapsed, conversations (ConversationItem[]), activeIndex, onSelect, onNewChat

2. Add sidebar CSS to index.css — generally match the prototype's sidebar look

3. Commit: "feat: build HistorySidebar with conversation list"
```

### Step 10: Build the FinancialTable and DocumentSelector components ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the FinancialTable and DocumentSelector components.

1. Create `frontend/src/components/FinancialTable.tsx`:
   - Takes `table: Record<string, Record<string, string | number>>` prop
   - Renders as an HTML table: first column = row labels, other columns from the table dict keys
   - Extract all unique row keys from the table values
   - Apply number formatting and alignment (right-align numbers)
   - Style similar to the prototype's financial table (clean borders, alternating rows optional)

2. Create `frontend/src/components/DocumentSelector.tsx`:
   - A dropdown button showing the current document name
   - Click opens a dropdown list with all sample documents
   - Each item: 2-letter abbreviation icon, document name, description
   - Active item has a checkmark
   - Footer: "Upload your own document" button
   - Props: documents (SampleDocument[]), selectedIndex, onSelect, onUpload

3. Add CSS for both components

4. Commit: "feat: build FinancialTable and DocumentSelector components"
```

### Step 11: Build the DocumentViewer component ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the DocumentViewer component (center panel).

1. Create `frontend/src/components/DocumentViewer.tsx`:
   - Toolbar: sidebar toggle button (left), DocumentSelector (center-left), zoom controls (right), chat toggle button (right)
   - Scrollable document content area
   - Inside: a "page" div styled like a document page:
     - Company header: 2-letter icon + company name + subtitle
     - "Narrative Context" section: renders pre_text
     - "Financial Data" section: renders FinancialTable
     - "Additional Notes" section: renders post_text
     - Page number footer
   - Floating chat toggle button (visible when chat is collapsed)
   - Props: document (FinancialDocument | null), documentMeta ({ company, shortLabel, subtitle }), documents (for selector), selectedIndex, onSelectDocument, onToggleSidebar, onToggleChat, onUpload

2. Add zoom state: scale the doc-page div via CSS transform

3. Add CSS for document viewer — similar general feel to prototype (white page on gray background, clean sections)

4. Commit: "feat: build DocumentViewer with toolbar and page rendering"
```

### Step 12: Build the ChatPanel component 🧠 Plan → Execute
- [x] **DONE**

**Prompt:**
```
Build the ChatPanel component (right panel).

1. Create `frontend/src/components/ChatPanel.tsx` with three sections:

   **Header:**
   - Icon + "AI Assistant" title
   - Expand, new chat, and close buttons

   **Body (scrollable):**
   - Empty state: icon, heading "Ask about this document", description, suggestion chips (4 clickable buttons with question text)
   - Message list: user messages (indigo bubble) and assistant messages (gray bubble)
   - Each message: avatar, name label ("You" / "FinDoc AI"), content bubble, timestamp
   - For assistant answers: highlight the numerical answer with a distinct style (monospace font, light indigo background)
   - Typing indicator: three animated dots
   - Auto-scroll to bottom on new messages

   **Input area:**
   - Textarea with placeholder "Ask about this document..."
   - Send button (indigo, arrow icon)
   - Enter to send, Shift+Enter for newline
   - Disabled while loading
   - Footer: "FinDoc AI uses Llama 3.1. Verify important calculations."

2. Props: messages, isLoading, suggestions, onSendMessage, onClose, onExpand, onNewChat, expanded

3. Add CSS — capture the general chat panel look from prototype (indigo user bubbles, gray assistant bubbles, clean input area)

4. Commit: "feat: build ChatPanel with messages, suggestions, and input"
```

---

## Phase 5: State Management & Integration

### Step 13: Build the useDocuments hook ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the useDocuments hook to manage document state.

1. Create `frontend/src/hooks/useDocuments.ts`:
   - On mount: fetch `/data/example_records.json`, parse into SampleDocument[]
   - Map each record to a human-readable label:
     - Record 0 (JKHY): "JKHY Corp — Cash Flow Analysis" / "JK" / "Fiscal Year 2007–2009"
     - Record 1 (RSG): "Republic Services — Pro Forma" / "RS" / "Fiscal Year 2007–2008"
     - Record 2 (UPS double): "UPS — Financial Overview" / "UP" / "Fiscal Year 2008–2009"
     - Record 3 (UPS single): "UPS — Revenue Analysis" / "UP" / "Fiscal Year 2008–2009"
     - Record 4 (CE): "Celanese Corp — Segment Data" / "CE" / "Fiscal Year 2008–2010"
   - State: documents[], selectedIndex, isLoading
   - `selectDocument(index)`: update selectedIndex
   - Derive: selectedDocument, suggestions (conv_questions from selected record's dialogue)

2. Return: { documents, selectedIndex, selectedDocument, suggestions, isLoading, selectDocument }

3. Commit: "feat: build useDocuments hook for sample document management"
```

### Step 14: Build the API client and useChat hook ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the API client and useChat hook.

1. Create `frontend/src/lib/api.ts`:
   - `sendChatMessage(request: ChatRequest): Promise<ChatResponse>`
   - POST to `/api/chat` with JSON body
   - Handle errors: throw on non-OK responses with the error message

2. Create `frontend/src/hooks/useChat.ts`:
   - State: messages (ChatMessage[]), conversationHistory (ConversationHistoryEntry[]), isLoading, error
   - `sendMessage(question, document, model)`:
     - Add user message to messages
     - Set isLoading true
     - Call API with document, conversationHistory, question, model
     - On success: add assistant message, append to conversationHistory
     - On error: add error message to chat, set error state
     - Set isLoading false
   - `clearChat()`: reset messages and history

3. Return: { messages, isLoading, error, sendMessage, clearChat }

4. Commit: "feat: build API client and useChat hook"
```

### Step 15: Wire everything together in App.tsx 🧠 Plan → Execute
- [x] **DONE**

**Prompt:**
```
Integrate all components and hooks in App.tsx.

1. Update `frontend/src/App.tsx`:
   - Use `useDocuments()` and `useChat()` hooks
   - Manage UI state: sidebarCollapsed, chatVisible, chatExpanded, selectedModel ('llama-3.1-8b' | 'llama-3.3-70b')
   - Build a conversations list from chat history for the sidebar
   - Wire all props:
     - Header: document title from selected doc, model, toggle model, open upload
     - HistorySidebar: collapsed state, conversations, selection
     - DocumentViewer: selected document data, document list for selector, toggle callbacks
     - ChatPanel: messages, loading, suggestions from selected doc, send handler, toggles
   - When document changes: clear the chat
   - When suggestion is clicked: send it as a message
   - Model selector: toggle between the two models on click

2. Configure Vite proxy for development — update `frontend/vite.config.ts`:
   ```typescript
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:8000',
         changeOrigin: true,
       }
     }
   }
   ```

3. Verify the frontend renders with sample data, document selection works, and chat input is functional (API calls will fail without the backend running — that's fine)

4. Commit: "feat: wire all components and hooks together in App.tsx"
```

---

## Phase 6: Upload & Formatting

### Step 16: Build the Upload Modal ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build the UploadModal for custom document input.

1. Create `frontend/src/components/UploadModal.tsx` with two tabs:

   **Paste Tab:**
   - Pre-text textarea ("Narrative text before the table")
   - Post-text textarea ("Narrative text after the table")
   - Table textarea ("Paste tab-separated or CSV table data") with a parser that converts it to the dict-of-dicts format
   - "Load Document" button

   **JSON Upload Tab:**
   - File drop zone (dashed border) accepting .json files
   - Validates the JSON has pre_text, post_text, and table fields
   - Shows validation errors
   - "Load Document" button

2. Modal overlay with backdrop, close button
3. Props: isOpen, onClose, onUpload (receives FinancialDocument)
4. Wire into App.tsx: isUploadOpen state, connect to Header and DocumentSelector upload buttons
5. When uploaded: add as custom document to the list, select it

6. Commit: "feat: build UploadModal with paste and JSON upload modes"
```

### Step 17: Build answer formatting utilities ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Build answer formatting and display utilities.

1. Create `frontend/src/lib/formatters.ts`:
   - `formatAnswer(raw: string)`: detect if answer is number, percentage, or text
     - Numbers: add comma separators (206588 → 206,588)
     - Percentages: ensure % symbol
     - Return: { value, type, formatted }
   - `formatTableForDisplay(table)`: convert nested dict to flat rows for rendering
     - Return: { headers: string[], rows: { label: string, values: (string|number)[] }[] }

2. Update ChatPanel to use formatAnswer:
   - Wrap answer in a highlighted span (monospace, light background, left accent border)
   - Add brief context line below answer ("Extracted from table" or "Calculated from document data")

3. Update FinancialTable to use formatTableForDisplay if beneficial

4. Commit: "feat: add answer formatting and display utilities"
```

---

## Phase 7: Polish & Error Handling

### Step 18: Add error handling, loading states, and UX polish 🧠 Plan → Execute
- [x] **DONE**

**Prompt:**
```
Add error handling, loading states, and UX polish across the app.

1. **Error handling:**
   - Display API errors in chat as styled error messages (red accent)
   - Add retry button on error messages
   - Handle network failures gracefully
   - Backend: return useful error messages (not stack traces)

2. **Loading states:**
   - Typing indicator (three bouncing dots) while waiting for response
   - Disable input and send button while loading
   - Skeleton loading while documents are fetching

3. **Chat UX:**
   - Auto-scroll to bottom on new messages (useEffect + ref)
   - Copy button on assistant messages
   - Textarea auto-resize
   - Focus input after sending

4. **Document viewer:**
   - Zoom in/out actually scales the page div
   - Subtle table row hover highlight

5. **Responsive:**
   - Sidebar auto-collapses at narrow widths
   - Chat stacks below at mobile widths
   - Floating chat button when chat panel is hidden

6. Commit: "feat: add error handling, loading states, and UX polish"
```

---

## Phase 8: Testing & Deployment

### Step 19: End-to-end verification ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Verify the full application works end-to-end.

1. Build frontend: `cd frontend && npm run build`
2. Verify TypeScript compiles: `cd frontend && npx tsc --noEmit`
3. Start backend: `cd backend && uvicorn main:app --reload --port 8000`
4. Start frontend: `cd frontend && npm run dev`

5. Verify these flows work in the code:
   - Sample document loads and renders (text + table)
   - Document selector switches between all 5 documents
   - Chat clears when switching documents
   - Suggestion chips show dialogue questions from selected record
   - Chat input sends messages and displays responses (requires backend + credentials)
   - Conversation history is maintained across turns
   - Model selector toggles between models
   - Upload modal opens, validates, and loads custom documents
   - Sidebar shows conversation history
   - All responsive breakpoints work

6. Fix any TypeScript errors, broken imports, or missing styles found

7. Commit: "fix: resolve issues found during end-to-end verification"
```

### Step 20: Production deployment preparation ⚡ Execute
- [x] **DONE**

**Prompt:**
```
Prepare both frontend and backend for production deployment.

1. **Frontend production build:**
   - `cd frontend && npm run build`
   - Verify dist/ has index.html, assets/, and data/example_records.json
   - Add `frontend/public/favicon.svg` (simple indigo document icon)
   - Update index.html title to "FinDoc AI — Financial Document Assistant"

2. **Frontend API base URL for production:**
   - Update `frontend/src/lib/api.ts` to use an environment variable for the API URL:
     ```typescript
     const API_BASE = import.meta.env.VITE_API_URL || '';
     // Then use: fetch(`${API_BASE}/api/chat`, ...)
     ```
   - In production, set `VITE_API_URL` to the Render deployment URL

3. **Backend deployment prep for Render:**
   - Create `backend/Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Or create `backend/render.yaml`:
     ```yaml
     services:
       - type: web
         name: findoc-api
         runtime: python
         buildCommand: pip install -r requirements.txt
         startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
         envVars:
           - key: CLOUDFLARE_ACCOUNT_ID
             sync: false
           - key: CLOUDFLARE_API_TOKEN
             sync: false
           - key: ALLOWED_ORIGINS
             sync: false
     ```
   - Update ALLOWED_ORIGINS in backend to include the Cloudflare Pages URL

4. Verify no console errors in production build
5. Run `cd frontend && npx tsc --noEmit` one final time

6. Commit: "feat: production deployment preparation"
```

### Step 21: Deploy frontend to Cloudflare Pages and backend to Render ⚡ Execute
- [ ] **DONE**

**Prompt:**
```
Deploy the application.

1. **Deploy frontend to Cloudflare Pages:**
   - `cd frontend && npm run build`
   - `npx wrangler pages deploy dist --project-name findoc-ai`
   - Note the deployment URL (e.g., findoc-ai.pages.dev)

2. **Deploy backend to Render:**
   - Push the repo to GitHub
   - Create a new Web Service on Render:
     - Root directory: `backend`
     - Build command: `pip install -r requirements.txt`
     - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
     - Add env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, ALLOWED_ORIGINS
   - Note the Render URL (e.g., findoc-api.onrender.com)

3. **Connect them:**
   - Rebuild frontend with `VITE_API_URL=https://findoc-api.onrender.com` and redeploy
   - Update backend ALLOWED_ORIGINS to include the Cloudflare Pages URL

4. Test the live deployment end-to-end

5. Commit: "chore: deployment configuration and notes"

NOTE: If wrangler/render login requires interactive auth, skip the actual deploy and note it for manual completion. The app should be fully working locally.
```

---

## Summary

| Phase | Steps | What's Built |
|-------|-------|-------------|
| 1. Scaffolding | 1–2 | Monorepo structure, FastAPI skeleton, Vite frontend |
| 2. Backend Agent | 3–5 | Table formatter, LangChain agent, /api/chat endpoint |
| 3. Frontend Foundation | 6–7 | TypeScript types, global CSS & design tokens |
| 4. React Components | 8–12 | Header, Sidebar, DocViewer, Table, DocSelector, ChatPanel |
| 5. State & Integration | 13–15 | useDocuments, useChat, API client, full wiring |
| 6. Upload & Formatting | 16–17 | Upload modal, answer formatting |
| 7. Polish | 18 | Error handling, loading states, responsive UX |
| 8. Ship | 19–21 | E2E testing, production build, deploy |
