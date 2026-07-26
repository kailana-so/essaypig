# Decisions

## Switch summary pig to OpenRouter

Replace DeepSeek with OpenRouter as the LLM provider for the summary pig route. OpenRouter provides automatic model fallbacks when a provider is down, which gives us the "better fallback" behavior the user wants without custom retry logic. Using the standard HTTP API (no SDK needed). Primary model: `openai/gpt-4o-mini` with `provider.allow_fallbacks: true`.

## PWA via vite-plugin-pwa

Use `vite-plugin-pwa` to auto-generate the service worker, manifest, and icon references at build time. This rules out a manually written service worker, custom Workbox configuration, and manifest files maintained by hand.

## Server-side PDF/EPUB text extraction (Option A)

Parse PDFs with `pdf-parse` and EPUBs with the `epub` package on the server after fetching the binary from S3 via `arrayBuffer()`. This rules out client-side text extraction (Option B) and having the client send extracted text alongside the upload to bypass the S3 round-trip (Option C).

## Pass raw URL to LLM for link summaries

Send the raw user-submitted URL string directly to the LLM in the user prompt. This rules out the three-tier fallback with server-side page fetching/Readability, and rules out the `titleFromUrl`-only slug preprocessing that was introduced in commit `78f9f844`.
