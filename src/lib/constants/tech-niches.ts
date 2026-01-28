/**
 * Tech Niches - Shared across onboarding, settings, and profile components
 * 
 * xthread supports creators across all areas of emerging technology,
 * not just crypto. Users select their focus areas to personalize content generation.
 */

export interface TechNiche {
  id: string;
  label: string;
  description?: string;
}

/**
 * Primary tech niches available for user selection
 * These represent the major areas of emerging technology
 */
export const TECH_NICHES: TechNiche[] = [
  { id: 'ai-ml', label: 'AI / Machine Learning', description: 'Artificial intelligence, LLMs, ML research' },
  { id: 'crypto-web3', label: 'Crypto / Web3', description: 'Blockchain, DeFi, digital assets' },
  { id: 'robotics', label: 'Robotics / Hardware', description: 'Robots, drones, physical AI, hardware' },
  { id: 'quantum', label: 'Quantum Computing', description: 'Quantum computers, algorithms, research' },
  { id: 'biotech', label: 'Biotech / Health Tech', description: 'Genomics, longevity, medical tech' },
  { id: 'space', label: 'Space / Aerospace', description: 'Rockets, satellites, space exploration' },
  { id: 'climate', label: 'Climate Tech', description: 'Clean energy, sustainability, carbon tech' },
  { id: 'fintech', label: 'Fintech', description: 'Payments, banking tech, trading systems' },
  { id: 'cybersecurity', label: 'Cybersecurity', description: 'Security, privacy, threat research' },
  { id: 'devtools', label: 'Developer Tools', description: 'IDEs, APIs, infrastructure, open source' },
  { id: 'gaming', label: 'Gaming / VR / AR', description: 'Game dev, virtual reality, metaverse' },
  { id: 'general-tech', label: 'General Tech', description: 'Startups, product, tech industry trends' },
];

/**
 * Content goals - what users want to achieve
 */
export const CONTENT_GOALS = [
  { id: 'authority', label: 'Build authority/credibility', description: 'Become a trusted voice in your niche' },
  { id: 'followers', label: 'Grow follower count', description: 'Expand your reach and audience' },
  { id: 'traffic', label: 'Drive traffic', description: 'Newsletter, Discord, product, etc.' },
  { id: 'network', label: 'Network with others', description: 'Connect with people in the space' },
  { id: 'document', label: 'Document my journey', description: 'Build in public, share learnings' },
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
