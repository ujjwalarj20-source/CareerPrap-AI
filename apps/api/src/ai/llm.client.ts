import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

let client: Anthropic | undefined;

/** Maps provider errors to safe, user-facing messages (details are logged, never returned). */
function toAiError(err: unknown): AppError {
  if (err instanceof Anthropic.APIError) {
    console.error(`Anthropic API error: status=${err.status ?? 'n/a'} type=${err.name} message=${err.message}`);
    if (err.status === 401 || err.status === 403) {
      return new AppError(503, 'The AI service rejected the server API key. Please contact support.');
    }
    if (err.status === 404) return new AppError(503, 'The configured AI model is unavailable. Please contact support.');
    if (err.status === 429) return new AppError(503, 'The AI service is busy right now. Please try again in a minute.');
    if (err.status && err.status >= 500) return new AppError(503, 'The AI service is temporarily unavailable. Please try again.');
    return new AppError(502, 'The AI service could not process this resume. Please try again.');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    console.error('Anthropic connection error:', err.message);
    return new AppError(503, 'Could not reach the AI service. Please try again shortly.');
  }
  console.error('Unexpected AI client error:', err);
  return new AppError(502, 'The AI service failed unexpectedly. Please try again.');
}

/** Thin wrapper around the LLM provider so the rest of the app never touches the SDK directly. */
export async function completeText(opts: { system: string; user: string; maxTokens: number }): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(503, 'AI provider is not configured. Set ANTHROPIC_API_KEY on the server.');
  }
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 90_000 });
  let res;
  try {
    res = await client.messages.create({
      model: env.AI_MODEL,
      max_tokens: opts.maxTokens,
      temperature: 0,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    });
  } catch (err) {
    throw toAiError(err);
  }
  if (res.stop_reason === 'max_tokens') {
    throw new AppError(502, 'The resume is too long for the AI to analyze in one pass. Try a shorter resume.');
  }
  return res.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
}

/** Pulls the first JSON object out of a model reply, tolerating stray code fences or prose. */
export function parseJsonObject(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(raw.slice(start, end + 1));
}
