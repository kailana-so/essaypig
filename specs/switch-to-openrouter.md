## Story

Replace DeepSeek with OpenRouter as the LLM provider for the summary pig route. OpenRouter provides automatic model fallbacks — if the primary model fails, it routes to another. This gives us the "better fallback" the user wants without writing custom retry logic. The route itself stays simple: extract text, send to LLM, return JSON.

## Tech stack

- OpenRouter API (HTTP REST, no SDK needed)
- Primary model: `openai/gpt-4o-mini` (cheap, fast, good at summaries)
- Fallback: automatic via OpenRouter's `provider.allow_fallbacks`

## Dependencies

None. OpenRouter is a standard HTTP API — we already use `fetch`.

## Files

### `.github/workflows/deploy.yml` — add OpenRouter secret

Add `OPENROUTER_API_KEY` to the env block and the `server/.env` write step.

### `server/routes/summarypig.ts` — rewrite for OpenRouter

**Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

**Headers:**
- `Authorization: Bearer {process.env.OPENROUTER_API_KEY}`
- `HTTP-Referer: https://essaypig.com` (optional, for OpenRouter rankings)
- `X-Title: Essay Pig` (optional)
- `Content-Type: application/json`

**Body:**
```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [...],
  "provider": { "allow_fallbacks": true },
  "temperature": 0.5,
  "max_tokens": 200
}
```

**Prompt:** Restore the original working prompt:

System: `"You love summarising texts into 1–2 sentence descriptions including the title of the text and 2 questions. Questions should be concise (max 12 words), clever or funny and raise new viewpoints on the text or author. Return JSON format with 'title', 'body', 'questions': { 'question1', 'question2' } keys. Include nothing else."`

User: `"Summarize this:\n\n{extractedText}"`

**Link path:** Pass the raw URL string directly as `extractedText`. No fetch, no Readability.

**File path:** Read from S3, parse PDF first 3 pages with `pdf-parse`, pass text.

**Error handling:** Wrap the entire OpenRouter call in try-catch. On any failure (network, 4xx, 5xx, bad JSON):
- Return 200 with mechanical fallback
- Links: `title = titleFromUrl(resource)`, `body = ""`, `questions = { question1: "", question2: "" }`
- Files: `title = fileName`, `body = ""`, `questions = { question1: "", question2: "" }`

**Response shape:** `{ summary: { title, body, questions } }` — matches the original.

### `client/src/pages/Gobbler.tsx` — remove defensive checks

Remove the `if (!summaryRes.ok)` guards added in earlier commits. The server now always returns 200, so the client can simply `const { summary } = await summaryRes.json()` as it did originally.

## Setup required (user action before deploy)

1. Add `OPENROUTER_API_KEY` to GitHub repository secrets
2. Remove `DS_API_URL`, `DS_API_KEY`, `DS_MODEL` from GitHub secrets (optional cleanup)

## Acceptance criteria

1. Submit a link — OpenRouter returns summary within 10 seconds
2. OpenRouter primary model down — automatic fallback to another model, still returns 200
3. OpenRouter completely down — server returns 200 with mechanical fallback, client never crashes
4. Submit a PDF — server reads from S3, parses text, returns summary
5. Both client and server build pass
6. Deploy pipeline writes the correct `.env` with `OPENROUTER_API_KEY`