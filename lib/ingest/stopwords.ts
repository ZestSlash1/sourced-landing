export const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "and", "or", "but", "to", "of", "in", "on", "for",
  "with", "that", "this", "it", "i", "you", "we", "they", "my", "your", "our", "be", "has", "have",
  "had", "do", "does", "did", "not", "no", "so", "if", "as", "at", "by", "from", "there", "here",
  "just", "like", "can", "could", "would", "should", "will", "im", "its", "any", "all", "how",
  // HN/YC/etc boilerplate that otherwise clusters unrelated posts together.
  "hn", "yc", "ycombinator", "launch", "show", "ask", "tell", "hiring", "hackernews",
]);

/**
 * Strips stopwords before a title/text goes into the embedding model. Doesn't
 * change what the model *understands* (embedding models handle stopwords
 * fine on their own) but keeps the input shorter and denoises boilerplate
 * phrasing ("Show HN:", "Ask HN:") that otherwise nudges embeddings toward
 * platform-specific vocabulary rather than the underlying complaint.
 */
export function denoise(text: string): string {
  const words = text.split(/\s+/);
  return words.filter((w) => !STOPWORDS.has(w.toLowerCase().replace(/[^a-z'-]/g, ""))).join(" ");
}
