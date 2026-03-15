Execute the next unchecked step in the build plan.

## Procedure

1. **Read context first:**
   - Read `CLAUDE.md` for full project context
   - Read `plan.md` and find the first step with `- [ ]` (unchecked checkbox)
   - If all steps are checked, report "All steps complete!" and stop

2. **Check the mode tag on that step's header line:**
   - If the header contains **⚡ Execute** → proceed directly to building
   - If the header contains **🧠 Plan → Execute** → first analyze the step thoroughly:
     - Read all files that will be touched or depended on
     - Identify edge cases and architectural decisions
     - Outline your approach in a brief comment before writing code
     - Then proceed to building

3. **Execute the step:**
   - Read the **Prompt** block for that step carefully
   - Execute every instruction in the prompt (create files, run commands, verify)
   - For frontend steps: verify TypeScript compiles — `cd frontend && npx tsc --noEmit`
   - For backend steps: verify Python imports — `cd backend && python -c "import main"` or similar
   - Reference `prototype-v2.html` for general design inspiration (similar style, NOT pixel-perfect)

4. **Mark complete:**
   - In `plan.md`, change `- [ ] **DONE**` to `- [x] **DONE**` for this step
   - Create a git commit with the message specified in the step's prompt

5. **Report:**
   - State which step was completed (number + title)
   - Summarize what was built
   - State what the next step will be

## Rules

- Execute exactly **ONE** step per invocation
- **NEVER** modify files in the `reference/` directory — it is read-only inspiration
- If a step fails, report the error and do **NOT** mark it as done
- The frontend is in `frontend/`, the backend is in `backend/` — always cd to the correct directory
- All new files go in `frontend/` or `backend/`, never in the project root (except config files)
