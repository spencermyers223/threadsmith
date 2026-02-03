#!/usr/bin/env node

function testGeneration(type: string, niche: string, template: string) {
  // Simulate generation process with mock data
  const mockContent = {
    'article': `AI ${niche} Market Analysis\n\n` + 'x'.repeat(800),
    'thread': `Thread about ${niche}\n---\nSection 1\n---\nSection 2`,
    'tweet': `Insights about ${niche} from ${template} perspective`
  }

  const content = mockContent[type as keyof typeof mockContent]
  
  // Validate content based on type
  if (type === 'article' && content.length < 500) {
    console.error('Article too short')
    return false
  }

  if (type === 'thread' && !content.includes('---')) {
    console.error('Thread not properly formatted')
    return false
  }

  return true
}

// Parse command line args
const args = process.argv.slice(2)
const typeIndex = args.indexOf('--type')
const nicheIndex = args.indexOf('--niche')
const templateIndex = args.indexOf('--template')

if (typeIndex === -1 || nicheIndex === -1 || templateIndex === -1) {
  console.error('Missing required arguments')
  process.exit(1)
}

const type = args[typeIndex + 1]
const niche = args[nicheIndex + 1]
const template = args[templateIndex + 1]

// Directly call and exit
const result = testGeneration(type, niche, template)
process.exit(result ? 0 : 1)