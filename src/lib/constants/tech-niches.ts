/**
 * Content Niches - Shared across onboarding, settings, and profile components
 * 
 * xthread supports creators across ALL niches, not just tech.
 * These broad categories help personalize content generation.
 */

export interface TechNiche {
  id: string;
  label: string;
  description?: string;
}

/**
 * Primary niches available for user selection
 * Broad categories that fit any creator
 */
export const TECH_NICHES: TechNiche[] = [
  { id: 'technology', label: 'Technology', description: 'AI, startups, dev tools, gadgets, software' },
  { id: 'finance', label: 'Finance & Investing', description: 'Markets, trading, crypto, personal finance' },
  { id: 'business', label: 'Business & Startups', description: 'Entrepreneurship, leadership, productivity' },
  { id: 'marketing', label: 'Marketing & Sales', description: 'Growth, social media, copywriting, ads' },
  { id: 'sports-fitness', label: 'Sports & Fitness', description: 'Athletics, training, nutrition, sports news' },
  { id: 'entertainment', label: 'Entertainment', description: 'Gaming, movies, music, pop culture' },
  { id: 'education', label: 'Education & Career', description: 'Learning, career advice, skill building' },
  { id: 'health-wellness', label: 'Health & Wellness', description: 'Mental health, self-care, medical' },
  { id: 'creative', label: 'Creative & Design', description: 'Art, photography, writing, design' },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Travel, food, fashion, personal brand' },
  { id: 'news-politics', label: 'News & Politics', description: 'Current events, commentary, analysis' },
  { id: 'other', label: 'Other', description: 'Something else entirely' },
];

/**
 * Content goals - what users want to achieve
 */
export const CONTENT_GOALS = [
  { id: 'authority', label: 'Build authority/credibility', description: 'Become a trusted voice in your niche' },
  { id: 'followers', label: 'Grow follower count', description: 'Expand your reach and audience' },
  { id: 'traffic', label: 'Drive traffic', description: 'Newsletter, Discord, product, etc.' },
  { id: 'network', label: 'Network with others', description: 'Connect with people in your space' },
  { id: 'document', label: 'Document my journey', description: 'Build in public, share learnings' },
  { id: 'sales', label: 'Generate leads/sales', description: 'Drive business results from content' },
];

/**
 * Posting frequency options
 */
export const POSTING_FREQUENCIES = [
  { id: '1_day', label: '1 post/day' },
  { id: '2_day', label: '2 posts/day' },
  { id: '3_day', label: '3+ posts/day' },
  { id: '3_week', label: '3 posts/week' },
  { id: '1_week', label: '1 post/week' },
];

/**
 * Get niche label by ID
 */
export function getNicheLabel(id: string): string {
  const niche = TECH_NICHES.find(n => n.id === id);
  return niche?.label || id;
}

/**
 * Check if a niche ID is valid
 */
export function isValidNiche(id: string): boolean {
  return TECH_NICHES.some(n => n.id === id);
}
