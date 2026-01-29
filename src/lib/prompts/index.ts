/**
 * Prompts Module Index
 * Central export for all prompt-related utilities and post type prompts
 */

// ============================================
// Shared Utilities (Algorithm Rules, Voice Guidelines)
// ============================================
export {
  ALGORITHM_RULES,
  TECH_TWITTER_VOICE,
  CT_VOICE, // Legacy alias for backwards compatibility
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
  ENDING_CTA_PATTERNS,
} from './algorithm-knowledge';

// ============================================
// Humanness library
// ============================================
export {
  HUMANNESS_PHRASES,
  ROBOTIC_PHRASES,
  SEVERE_AI_PATTERNS,
  getRandomPhrase,
  containsRoboticPatterns,
  containsSevereAIPatterns,
  scoreContentQuality,
} from './humanness';

// ============================================
// Archetype prompts (legacy archetypes)
// ============================================
export { SCROLL_STOPPER_PROMPT, SCROLL_STOPPER_HOOKS } from './scroll-stopper';
export { DEBATE_STARTER_PROMPT, DEBATE_STARTER_HOOKS } from './debate-starter';
export { VIRAL_CATALYST_PROMPT, VIRAL_CATALYST_HOOKS } from './viral-catalyst';

// ============================================
// Post Type Prompts
// ============================================

// Industry Take - Quick opinion on trends/news (formerly Market Take)
export {
  INDUSTRY_TAKE_PROMPT,
  MARKET_TAKE_PROMPT, // Legacy alias
  INDUSTRY_TAKE_HOOKS,
  MARKET_TAKE_HOOKS, // Legacy alias
  marketTakePrompt,
  industryTakePrompt, // New name
  type IndustryTakeContext,
  type MarketTakeContext, // Legacy alias
} from './market-take';

// Hot Take - Contrarian/provocative opinions
export {
  HOT_TAKE_PROMPT,
  HOT_TAKE_HOOKS,
  hotTakePrompt,
  type HotTakeContext,
} from './hot-take';

// Data Insight - Data-driven observations (formerly On-Chain Insight)
export {
  DATA_INSIGHT_PROMPT,
  ON_CHAIN_INSIGHT_PROMPT, // Legacy alias
  DATA_INSIGHT_HOOKS,
  ON_CHAIN_INSIGHT_HOOKS, // Legacy alias
  onChainInsightPrompt,
  dataInsightPrompt, // New name
  type DataInsightContext,
} from './on-chain-insight';

// Alpha Thread - Share non-obvious insights/research
export {
  alphaThreadPrompt,
  ALPHA_THREAD_HOOKS,
  ALPHA_THREAD_CTAS,
  type AlphaThreadUserContext,
  type AlphaThreadOptions,
} from './alpha-thread';

// Technical Deep Dive - Educational deep-dive (formerly Protocol Breakdown)
export {
  protocolBreakdownPrompt,
  technicalDeepDivePrompt, // New name
  PROTOCOL_BREAKDOWN_HOOKS,
  PROTOCOL_BREAKDOWN_CTAS,
  PROTOCOL_RISK_TEMPLATES,
  type TechnicalDeepDiveUserContext,
  type TechnicalDeepDiveOptions,
  type ProtocolBreakdownUserContext, // Legacy alias
  type ProtocolBreakdownOptions, // Legacy alias
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
  industry_take: 'industryTakePrompt',
  market_take: 'marketTakePrompt', // Legacy alias
  hot_take: 'hotTakePrompt',
  data_insight: 'dataInsightPrompt',
  on_chain_insight: 'onChainInsightPrompt', // Legacy alias
  alpha_thread: 'alphaThreadPrompt',
  technical_deep_dive: 'technicalDeepDivePrompt',
  protocol_breakdown: 'protocolBreakdownPrompt', // Legacy alias
  build_in_public: 'buildInPublicPrompt',
} as const;

export type PostType = keyof typeof POST_TYPE_PROMPTS;
