/**
 * Prompts Module Index
 * Central export for all prompt-related utilities
 */

// Main prompt builder
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

// Algorithm knowledge
export {
  ALGORITHM_KNOWLEDGE,
  ALGORITHM_WARNINGS,
  HOOK_PATTERNS,
} from './algorithm-knowledge';

// Archetype prompts
export { SCROLL_STOPPER_PROMPT, SCROLL_STOPPER_HOOKS } from './scroll-stopper';
export { DEBATE_STARTER_PROMPT, DEBATE_STARTER_HOOKS } from './debate-starter';
export { VIRAL_CATALYST_PROMPT, VIRAL_CATALYST_HOOKS } from './viral-catalyst';
