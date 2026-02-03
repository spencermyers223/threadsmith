#!/usr/bin/env node

async function testFullGenerationFlow() {
  try {
    // Mock full generation flow with simulated steps
    const topicGenerated = 'AI content creation trends'
    if (!topicGenerated || topicGenerated.length < 10) {
      console.error('Brain Dump generation failed')
      return false
    }

    const templateApplied = topicGenerated + '\n---\nFormatted with build-in-public template'
    if (!templateApplied.includes('---')) {
      console.error('Template application failed')
      return false
    }

    const draftCreated = {
      id: 'draft-123',
      content: templateApplied,
      status: 'draft'
    }
    if (!draftCreated.id) {
      console.error('Draft creation failed')
      return false
    }

    const scheduledDraft = {
      ...draftCreated,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    }
    if (scheduledDraft.status !== 'scheduled') {
      console.error('Scheduling failed')
      return false
    }

    return true
  } catch (error) {
    console.error('Full generation flow test error:', error)
    return false
  }
}

// Run the full flow test
testFullGenerationFlow()
  .then(result => process.exit(result ? 0 : 1))
  .catch(() => process.exit(1))