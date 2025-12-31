// Fisher-Yates shuffle algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp as T;
  }
  return shuffled;
}

// Pick N random items from array
export function pickRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}
