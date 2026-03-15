Commit all current changes and push to the remote repository.

## Procedure

1. Run `git status` to see all changed and untracked files
2. Run `git diff --stat` to summarize what changed
3. Run `git log --oneline -5` to see recent commit style

4. **Stage files:**
   - Add all relevant changed files by name (do NOT use `git add -A` or `git add .`)
   - Never stage `.env`, credentials, `node_modules/`, `dist/`, `__pycache__/`, or `.venv/`
   - If unsure about a file, skip it and mention it in the report

5. **Commit:**
   - Write a concise commit message following conventional commits (feat/fix/chore/docs)
   - Focus on the "why" not the "what"
   - End with: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

6. **Push:**
   - Run `git push` to push to the current tracked branch
   - If no upstream is set, run `git push -u origin <current-branch>`
   - If push fails due to divergence, report the issue — do NOT force push

7. **Report:**
   - State the commit hash and message
   - List files included
   - Confirm the push succeeded and to which branch/remote
