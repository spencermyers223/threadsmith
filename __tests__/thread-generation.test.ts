import { generateThread } from '../lib/thread-generation'; // Assuming this is the path to your thread generation logic

describe('Thread Generation', () => {
  it('should generate a thread with proper tweet breaks', () => {
    const input = 'A comprehensive exploration of AI technologies and their impact on modern society';
    const thread = generateThread(input);

    expect(thread).toBeDefined();
    expect(thread.length).toBeGreaterThan(0);
    
    // Check that individual tweets are not too long
    thread.forEach(tweet => {
      expect(tweet.length).toBeLessThanOrEqual(280);
    });

    // Check that the thread represents a coherent narrative
    expect(thread[0]).toContain('A comprehensive exploration of AI technologies');
  });

  it('should handle edge cases like empty input', () => {
    const input = '';
    const thread = generateThread(input);

    expect(thread).toEqual([]);
  });

  it('should break long text into multiple tweets', () => {
    const longInput = 'A'.repeat(500);
    const thread = generateThread(longInput);

    expect(thread.length).toBeGreaterThan(1);
  });
});