const PROFILE_VERIFIED_AT = '2026-03-17';

function createSummaryExecutionProfile({
  profileId,
  provider,
  modelPattern = null,
  capabilities = {},
  execution = {},
  references = [],
}) {
  return Object.freeze({
    profileId,
    provider,
    modelPattern,
    verifiedAt: PROFILE_VERIFIED_AT,
    capabilities: Object.freeze({
      contextWindowTokens: capabilities.contextWindowTokens ?? null,
      maxOutputTokens: capabilities.maxOutputTokens ?? null,
      notes: capabilities.notes || '',
    }),
    execution: Object.freeze({
      agentSummaryConcurrency: execution.agentSummaryConcurrency ?? 1,
      issueSummaryMaxSourceChars: execution.issueSummaryMaxSourceChars ?? 4000,
      issueSummaryMaxCompletionTokens:
        execution.issueSummaryMaxCompletionTokens ?? 512,
      dailySummaryMaxAgents: execution.dailySummaryMaxAgents ?? 8,
      dailySummaryMaxAgentChars: execution.dailySummaryMaxAgentChars ?? 900,
      dailySummaryMaxCompletionTokens:
        execution.dailySummaryMaxCompletionTokens ?? 768,
      memoryContextMaxCompletionTokens:
        execution.memoryContextMaxCompletionTokens ?? 1024,
    }),
    references: Object.freeze([...references]),
  });
}

const PROVIDER_DEFAULT_PROFILES = Object.freeze({
  openai: createSummaryExecutionProfile({
    profileId: 'openai/default',
    provider: 'openai',
    capabilities: {
      notes:
        'Use a conservative fallback unless the model has an explicit profile.',
    },
    execution: {
      agentSummaryConcurrency: 2,
      issueSummaryMaxSourceChars: 18000,
      issueSummaryMaxCompletionTokens: 1536,
      dailySummaryMaxAgents: 24,
      dailySummaryMaxAgentChars: 1800,
      dailySummaryMaxCompletionTokens: 1536,
      memoryContextMaxCompletionTokens: 1536,
    },
    references: ['https://developers.openai.com/api/docs/models'],
  }),
  groq: createSummaryExecutionProfile({
    profileId: 'groq/default',
    provider: 'groq',
    capabilities: {
      notes:
        'Groq account TPM limits vary by organization, so the fallback stays intentionally conservative.',
    },
    execution: {
      agentSummaryConcurrency: 1,
      issueSummaryMaxSourceChars: 6000,
      issueSummaryMaxCompletionTokens: 768,
      dailySummaryMaxAgents: 12,
      dailySummaryMaxAgentChars: 1200,
      dailySummaryMaxCompletionTokens: 768,
      memoryContextMaxCompletionTokens: 1024,
    },
    references: ['https://console.groq.com/docs/rate-limits'],
  }),
  gemini: createSummaryExecutionProfile({
    profileId: 'gemini/default',
    provider: 'gemini',
    capabilities: {
      notes:
        'Gemini 2.5-family models share a 1M-token input class, so the fallback can stay fairly wide.',
    },
    execution: {
      agentSummaryConcurrency: 3,
      issueSummaryMaxSourceChars: 24000,
      issueSummaryMaxCompletionTokens: 1536,
      dailySummaryMaxAgents: 28,
      dailySummaryMaxAgentChars: 2000,
      dailySummaryMaxCompletionTokens: 2048,
      memoryContextMaxCompletionTokens: 2048,
    },
    references: [
      'https://ai.google.dev/gemini-api/docs/models/gemini',
      'https://ai.google.dev/gemini-api/docs/rate-limits',
    ],
  }),
});

const MODEL_SPECIFIC_PROFILES = Object.freeze([
  createSummaryExecutionProfile({
    profileId: 'openai/gpt-5-mini',
    provider: 'openai',
    modelPattern: /^gpt-5-mini(?:$|-)/i,
    capabilities: {
      contextWindowTokens: 400000,
      maxOutputTokens: 128000,
      notes:
        'OpenAI model page documents a 400k context window and 128k max output.',
    },
    execution: {
      agentSummaryConcurrency: 3,
      issueSummaryMaxSourceChars: 24000,
      issueSummaryMaxCompletionTokens: 2048,
      dailySummaryMaxAgents: 32,
      dailySummaryMaxAgentChars: 2200,
      dailySummaryMaxCompletionTokens: 2048,
      memoryContextMaxCompletionTokens: 2048,
    },
    references: ['https://developers.openai.com/api/docs/models/gpt-5-mini'],
  }),
  createSummaryExecutionProfile({
    profileId: 'openai/gpt-4.1',
    provider: 'openai',
    modelPattern: /^gpt-4\.1(?:$|-)/i,
    capabilities: {
      contextWindowTokens: 1047576,
      maxOutputTokens: 32768,
      notes:
        'OpenAI model page documents a 1,047,576-token context window with 32,768 max output.',
    },
    execution: {
      agentSummaryConcurrency: 2,
      issueSummaryMaxSourceChars: 28000,
      issueSummaryMaxCompletionTokens: 1536,
      dailySummaryMaxAgents: 36,
      dailySummaryMaxAgentChars: 2400,
      dailySummaryMaxCompletionTokens: 1536,
      memoryContextMaxCompletionTokens: 1536,
    },
    references: ['https://developers.openai.com/api/docs/models/gpt-4.1'],
  }),
  createSummaryExecutionProfile({
    profileId: 'groq/openai-gpt-oss-120b',
    provider: 'groq',
    modelPattern: /^openai\/gpt-oss-120b$/i,
    capabilities: {
      contextWindowTokens: 131072,
      maxOutputTokens: 65536,
      notes:
        'The model can accept a large context, but Groq on-demand TPM is often the tighter production bottleneck.',
    },
    execution: {
      agentSummaryConcurrency: 1,
      issueSummaryMaxSourceChars: 4096,
      issueSummaryMaxCompletionTokens: 512,
      dailySummaryMaxAgents: 8,
      dailySummaryMaxAgentChars: 900,
      dailySummaryMaxCompletionTokens: 512,
      memoryContextMaxCompletionTokens: 768,
    },
    references: [
      'https://console.groq.com/docs/model/openai/gpt-oss-120b',
      'https://console.groq.com/docs/rate-limits',
    ],
  }),
  createSummaryExecutionProfile({
    profileId: 'groq/llama-3.1-8b-instant',
    provider: 'groq',
    modelPattern: /^llama-3\.1-8b-instant$/i,
    capabilities: {
      contextWindowTokens: 131072,
      maxOutputTokens: 131072,
      notes:
        'The model page exposes a large output ceiling, but the workflow still uses a smaller cap to stay below account TPM.',
    },
    execution: {
      agentSummaryConcurrency: 1,
      issueSummaryMaxSourceChars: 7000,
      issueSummaryMaxCompletionTokens: 768,
      dailySummaryMaxAgents: 12,
      dailySummaryMaxAgentChars: 1200,
      dailySummaryMaxCompletionTokens: 1024,
      memoryContextMaxCompletionTokens: 1024,
    },
    references: [
      'https://console.groq.com/docs/model/llama-3.1-8b-instant',
      'https://console.groq.com/docs/rate-limits',
    ],
  }),
  createSummaryExecutionProfile({
    profileId: 'groq/qwen3-32b',
    provider: 'groq',
    modelPattern: /^qwen\/qwen3-32b$/i,
    capabilities: {
      contextWindowTokens: 131072,
      maxOutputTokens: 40960,
      notes:
        'The profile stays conservative because Groq rate limits remain account-specific.',
    },
    execution: {
      agentSummaryConcurrency: 1,
      issueSummaryMaxSourceChars: 6000,
      issueSummaryMaxCompletionTokens: 640,
      dailySummaryMaxAgents: 10,
      dailySummaryMaxAgentChars: 1100,
      dailySummaryMaxCompletionTokens: 768,
      memoryContextMaxCompletionTokens: 768,
    },
    references: [
      'https://console.groq.com/docs/model/qwen3-32b',
      'https://console.groq.com/docs/rate-limits',
    ],
  }),
  createSummaryExecutionProfile({
    profileId: 'groq/kimi-k2-instruct-0905',
    provider: 'groq',
    modelPattern: /^moonshotai\/kimi-k2-instruct-0905$/i,
    capabilities: {
      contextWindowTokens: 262144,
      maxOutputTokens: 16384,
      notes:
        'This Groq model is documented as preview, so the execution profile remains cautious.',
    },
    execution: {
      agentSummaryConcurrency: 1,
      issueSummaryMaxSourceChars: 10000,
      issueSummaryMaxCompletionTokens: 768,
      dailySummaryMaxAgents: 12,
      dailySummaryMaxAgentChars: 1400,
      dailySummaryMaxCompletionTokens: 1024,
      memoryContextMaxCompletionTokens: 1024,
    },
    references: [
      'https://console.groq.com/docs/model/moonshotai/kimi-k2-instruct-0905',
      'https://console.groq.com/docs/rate-limits',
    ],
  }),
  createSummaryExecutionProfile({
    profileId: 'gemini/gemini-2.5-flash-lite',
    provider: 'gemini',
    modelPattern: /^gemini-2\.5-flash-lite(?:$|-)/i,
    capabilities: {
      contextWindowTokens: 1048576,
      maxOutputTokens: 65536,
      notes:
        'Google documents Gemini 2.5 Flash-Lite in the 1M-input / 65,536-output class.',
    },
    execution: {
      agentSummaryConcurrency: 3,
      issueSummaryMaxSourceChars: 24000,
      issueSummaryMaxCompletionTokens: 1536,
      dailySummaryMaxAgents: 28,
      dailySummaryMaxAgentChars: 2000,
      dailySummaryMaxCompletionTokens: 1536,
      memoryContextMaxCompletionTokens: 1536,
    },
    references: [
      'https://ai.google.dev/gemini-api/docs/models/gemini',
      'https://ai.google.dev/gemini-api/docs/rate-limits',
    ],
  }),
  createSummaryExecutionProfile({
    profileId: 'gemini/gemini-2.5-flash',
    provider: 'gemini',
    modelPattern: /^gemini-2\.5-flash(?:$|-)/i,
    capabilities: {
      contextWindowTokens: 1048576,
      maxOutputTokens: 65536,
      notes:
        'Google documents Gemini 2.5 Flash in the 1M-input / 65,536-output class.',
    },
    execution: {
      agentSummaryConcurrency: 3,
      issueSummaryMaxSourceChars: 28000,
      issueSummaryMaxCompletionTokens: 2048,
      dailySummaryMaxAgents: 32,
      dailySummaryMaxAgentChars: 2200,
      dailySummaryMaxCompletionTokens: 2048,
      memoryContextMaxCompletionTokens: 2048,
    },
    references: [
      'https://ai.google.dev/gemini-api/docs/models/gemini',
      'https://ai.google.dev/gemini-api/docs/rate-limits',
    ],
  }),
  createSummaryExecutionProfile({
    profileId: 'gemini/gemini-2.5-pro',
    provider: 'gemini',
    modelPattern: /^gemini-2\.5-pro(?:$|-)/i,
    capabilities: {
      contextWindowTokens: 1048576,
      maxOutputTokens: 65536,
      notes:
        'Google documents Gemini 2.5 Pro in the 1M-input / 65,536-output class.',
    },
    execution: {
      agentSummaryConcurrency: 2,
      issueSummaryMaxSourceChars: 32000,
      issueSummaryMaxCompletionTokens: 2048,
      dailySummaryMaxAgents: 36,
      dailySummaryMaxAgentChars: 2400,
      dailySummaryMaxCompletionTokens: 2048,
      memoryContextMaxCompletionTokens: 2048,
    },
    references: [
      'https://ai.google.dev/gemini-api/docs/models/gemini',
      'https://ai.google.dev/gemini-api/docs/rate-limits',
    ],
  }),
]);

function normalizeProvider(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeModel(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function mergeProfiles(baseProfile, matchedProfile, model) {
  return Object.freeze({
    profileId: matchedProfile?.profileId || baseProfile.profileId,
    provider: baseProfile.provider,
    model,
    verifiedAt: matchedProfile?.verifiedAt || baseProfile.verifiedAt,
    capabilities: Object.freeze({
      ...baseProfile.capabilities,
      ...(matchedProfile?.capabilities || {}),
    }),
    execution: Object.freeze({
      ...baseProfile.execution,
      ...(matchedProfile?.execution || {}),
    }),
    references: Object.freeze([
      ...baseProfile.references,
      ...(matchedProfile?.references || []),
    ]),
  });
}

export function resolveSummaryExecutionProfile({ provider, model } = {}) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedModel = normalizeModel(model);
  const baseProfile = PROVIDER_DEFAULT_PROFILES[normalizedProvider];

  if (!baseProfile) {
    throw new Error(
      `Unsupported CLAWBRAIN_PROVIDER: ${provider}. Supported providers: ${Object.keys(PROVIDER_DEFAULT_PROFILES).join(', ')}.`,
    );
  }

  const matchedProfile = MODEL_SPECIFIC_PROFILES.find(
    (profile) =>
      profile.provider === normalizedProvider &&
      profile.modelPattern &&
      profile.modelPattern.test(normalizedModel),
  );

  return mergeProfiles(baseProfile, matchedProfile, normalizedModel);
}

export const SUMMARY_EXECUTION_PROFILES = Object.freeze({
  defaults: PROVIDER_DEFAULT_PROFILES,
  models: MODEL_SPECIFIC_PROFILES,
});
