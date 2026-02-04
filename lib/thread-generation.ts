export function generateThread(input: string, maxTweetLength: number = 280): string[] {
  if (!input) return [];

  const words = input.split(' ');
  const thread: string[] = [];
  let currentTweet = '';

  for (const word of words) {
    if ((currentTweet + ' ' + word).length <= maxTweetLength) {
      currentTweet += (currentTweet ? ' ' : '') + word;
    } else {
      thread.push(currentTweet);
      currentTweet = word;
    }
  }

  if (currentTweet) {
    thread.push(currentTweet);
  }

  return thread;
}