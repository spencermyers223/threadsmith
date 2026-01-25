/**
 * Prompts Module Index
 * Central export for all prompt-related utilities and post type prompts
 */

// ============================================
// Shared Utilities (Algorithm Rules, CT Voice)
// ============================================
export {
  ALGORITHM_RULES,
  CT_VOICE,
  OUTPUT_FORMAT_RULES,
  buildUserContext,
  buildUserContextSection,
  type UserVoiceProfile,
  type TonePreferences,
} from './shared';

// ============================================
// Main prompt builder (legacy - still used)
// ============================================
export {
  buildGenerationPrompt,
  getHookExamples,
  getAlgorithmWarnings,
  getHookPatterns,
  analyzeContent,
  type Archetype,
  type ContentLength,
  type ContentType,
  type Tone,
  type UserProfile,
  type GenerationOptions,
  type GeneratedPrompts,
} from './build-generation-prompt';

// ============================================
// Algorithm knowledge
// ============================================
export {
  ALGORITHM_KNOWLEDGE,
  ALGORITHM_WARNINGS,
  HOOK_PATTERNS,
} from './algorithm-knowledge';

// ============================================
// Archetype prompts (legacy archetypes)
// ============================================
export { SCROLL_STOPPER_PROMPT, SCROLL_STOPPER_HOOKS } from './scroll-stopper';
export { DEBATE_STARTER_PROMPT, DEBATE_STARTER_HOOKS } from './debate-starter';
export { VIRAL_CATALYST_PROMPT, VIRAL_CATALYST_HOOKS } from './viral-catalyst';

// ============================================
// CT-Native Post Type Prompts
// ============================================

// Market Take - Quick opinion on price action/macro
export {
  MARKET_TAKE_PROMPT,
  MARKET_TAKE_HOOKS,
  marketTakePrompt,
  type MarketTakeContext,
} from './market-take';

// Hot Take - Contrarian/provocative opinions
export {
  HOT_TAKE_PROMPT,
  HOT_TAKE_HOOKS,
  hotTakePrompt,
  type HotTakeContext,
} from './hot-take';

// On-Chain Insight - Data-driven observations
export {
  ON_CHAIN_INSIGHT_PROMPT,
  ON_CHAIN_INSIGHT_HOOKS,
  onChainInsightPrompt,
  type OnChainInsightContext,
} from './on-chain-insight';

// Alpha Thread - Share non-obvious insights/research
export {
  alphaThreadPrompt,
  ALPHA_THREAD_HOOKS,
  ALPHA_THREAD_CTAS,
  type AlphaThreadUserContext,
  type AlphaThreadOptions,
} from './alpha-thread';

// Protocol Breakdown - Educational deep-dive
export {
  protocolBreakdownPrompt,
  PROTOCOL_BREAKDOWN_HOOKS,
  PROTOCOL_BREAKDOWN_CTAS,
  PROTOCOL_RISK_TEMPLATES,
  type ProtocolBreakdownUserContext,
  type ProtocolBreakdownOptions,
} from './protocol-breakdown';

// Build-in-Public - Project updates, learnings, journey documentation
export {
  BUILD_IN_PUBLIC_PROMPT,
  BUILD_IN_PUBLIC_HOOKS,
  buildInPublicPrompt,
} from './build-in-public';

// ============================================
// Post Type Registry (for easy lookup)
// ============================================
export const POST_TYPE_PROMPTS = {
  market_take: 'marketTakePrompt',
  hot_take: 'hotTakePrompt',
  on_chain_insight: 'onChainInsightPrompt',
  alpha_thread: 'alphaThreadPrompt',
  protocol_breakdown: 'protocolBreakdownPrompt',
  build_in_public: 'buildInPublicPrompt',
} as const;

export type PostType = keyof typeof POST_TYPE_PROMPTS;
