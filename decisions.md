# Decisions

## Switch summary pig to OpenRouter

Replace DeepSeek with OpenRouter as the LLM provider for the summary pig route. OpenRouter provides automatic model fallbacks when a provider is down, which gives us the "better fallback" behavior the user wants without custom retry logic. Using the standard HTTP API (no SDK needed). Primary model: `openai/gpt-4o-mini` with `provider.allow_fallbacks: true`.
