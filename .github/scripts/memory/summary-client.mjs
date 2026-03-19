import process from 'node:process';

import { resolveSummaryExecutionProfile } from './summary-provider-profiles.mjs';

const SUMMARY_ENV_KEYS = Object.freeze({
  provider: 'CLAWBRAIN_PROVIDER',
  model: 'CLAWBRAIN_MODEL',
  apiKey: 'CLAWBRAIN_API_KEY',
});

const SUPPORTED_SUMMARY_INPUT_TYPES = new Set(['auto', 'text']);
const SUPPORTED_SUMMARY_PROVIDERS = Object.freeze(['openai', 'groq', 'gemini']);
const SUPPORTED_SUMMARY_PROVIDER_SET = new Set(SUPPORTED_SUMMARY_PROVIDERS);

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : '';
}

function normalizeSummaryProvider(value) {
  return normalizeOptionalString(value).toLowerCase();
}

function validateSummaryProvider(provider) {
  if (!provider || SUPPORTED_SUMMARY_PROVIDER_SET.has(provider)) {
    return;
  }

  throw new Error(
    `Unsupported CLAWBRAIN_PROVIDER: ${provider}. Supported providers: ${SUPPORTED_SUMMARY_PROVIDERS.join(', ')}.`,
  );
}

function resolveSummaryInput(args = {}) {
  const type = String(args.type || 'auto')
    .trim()
    .toLowerCase();
  const text = String(args.text || '').trim();
  const url = String(args.url || '').trim();

  if (!SUPPORTED_SUMMARY_INPUT_TYPES.has(type)) {
    throw new TypeError(
      `Memory summary only supports "text" input. Received type: ${type}`,
    );
  }

  if (url) {
    throw new TypeError(
      'Memory summary does not support url attachments in compact-memory scripts.',
    );
  }

  if (!text) {
    throw new TypeError('Memory summary requires non-empty text input.');
  }

  return {
    text,
  };
}

function buildOpenAICompatibleSummarySpec(endpoint) {
  return Object.freeze({
    resolveEndpoint() {
      return endpoint;
    },
    buildHeaders({ apiKey }) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody({ model, text, maxCompletionTokens }) {
      return {
        model,
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
        max_completion_tokens: maxCompletionTokens,
      };
    },
    readSummary(payload, provider) {
      const summary = payload?.choices?.[0]?.message?.content;
      if (typeof summary === 'string' && summary.trim()) {
        return summary.trim();
      }

      throw new Error(`${provider} provider returned no text summary.`);
    },
    readError(payload, provider, status) {
      return (
        payload?.error?.message ||
        `${provider} request failed with status ${status}.`
      );
    },
  });
}

const SUMMARY_PROVIDER_SPECS = Object.freeze({
  openai: buildOpenAICompatibleSummarySpec(
    'https://api.openai.com/v1/chat/completions',
  ),
  groq: buildOpenAICompatibleSummarySpec(
    'https://api.groq.com/openai/v1/chat/completions',
  ),
  gemini: Object.freeze({
    resolveEndpoint({ model }) {
      return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    },
    buildHeaders({ apiKey }) {
      return {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      };
    },
    buildBody({ text, maxCompletionTokens }) {
      return {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: maxCompletionTokens,
        },
      };
    },
    readSummary(payload) {
      const summary = (payload?.candidates || [])
        .flatMap((candidate) => candidate?.content?.parts || [])
        .map((part) => (typeof part?.text === 'string' ? part.text.trim() : ''))
        .filter(Boolean)
        .join('\n\n')
        .trim();

      if (summary) {
        return summary;
      }

      throw new Error('gemini provider returned no text summary.');
    },
    readError(payload, provider, status) {
      return (
        payload?.error?.message ||
        `${provider} request failed with status ${status}.`
      );
    },
  }),
});

function getSummaryProviderSpec(provider) {
  const spec = SUMMARY_PROVIDER_SPECS[provider];
  if (!spec) {
    throw new Error(`Unsupported provider type: ${provider}`);
  }

  return spec;
}

async function parseSummaryJsonResponse(response, provider) {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Failed to parse ${provider} response: ${error.message}`);
  }
}

function resolveSummaryProfile(summarySecrets) {
  return resolveSummaryExecutionProfile(summarySecrets);
}

export function buildSummarySecrets(overrides = {}) {
  const secrets = {};

  for (const [key, envKey] of Object.entries(SUMMARY_ENV_KEYS)) {
    const rawValue = overrides[key] ?? process.env[envKey] ?? '';
    const value =
      key === 'provider'
        ? normalizeSummaryProvider(rawValue)
        : normalizeOptionalString(rawValue);

    if (value) {
      secrets[key] = value;
    }
  }

  validateSummaryProvider(secrets.provider);

  return secrets;
}

export function requireSummarySecrets(overrides = {}) {
  const secrets = buildSummarySecrets(overrides);
  const missing = ['provider', 'model', 'apiKey'].filter(
    (key) => !secrets[key],
  );

  if (missing.length > 0) {
    const missingEnvKeys = missing.map((key) => SUMMARY_ENV_KEYS[key]);
    throw new Error(`Missing ${missingEnvKeys.join(', ')}.`);
  }

  return secrets;
}

export async function summarizeTextWithProvider({
  provider,
  model,
  apiKey,
  text,
  maxCompletionTokens,
}) {
  const spec = getSummaryProviderSpec(provider);
  const endpoint = spec.resolveEndpoint({ model });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: spec.buildHeaders({ apiKey }),
    body: JSON.stringify(
      spec.buildBody({
        model,
        text,
        maxCompletionTokens,
      }),
    ),
  });
  const payload = await parseSummaryJsonResponse(response, provider);

  if (!response.ok) {
    throw new Error(spec.readError(payload, provider, response.status));
  }

  return {
    summary: spec.readSummary(payload, provider),
    raw: payload,
  };
}

export function extractSummaryTextFromToolResult(result) {
  if (typeof result?.summary === 'string' && result.summary.trim()) {
    return result.summary.trim();
  }

  if (Array.isArray(result?.outputs)) {
    return result.outputs
      .map((item) => (typeof item === 'string' ? item : item?.text || ''))
      .join('\n\n')
      .trim();
  }

  return '';
}

export const summaryTool = {
  name: 'memory-summary',
  description:
    'Use CLAWBRAIN_* provider settings to summarize plain text prompts.',
  async handler(args, context = {}) {
    const { text } = resolveSummaryInput(args);
    const secrets = requireSummarySecrets(context?.secrets);
    const summaryProfile =
      context?.summaryProfile || resolveSummaryProfile(secrets);
    const maxCompletionTokens =
      context?.maxCompletionTokens ||
      summaryProfile.execution.issueSummaryMaxCompletionTokens;
    const result = await summarizeTextWithProvider({
      provider: secrets.provider,
      model: secrets.model,
      apiKey: secrets.apiKey,
      text,
      maxCompletionTokens,
    });

    return {
      provider: secrets.provider,
      requestedModel: secrets.model,
      model: secrets.model,
      profileId: summaryProfile.profileId,
      summary: result.summary,
      outputs: [result.summary],
      raw: result.raw || null,
    };
  },
};
