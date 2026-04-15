export const CONTENT_TYPES = [
  { id: "book",    label: "Book",     color: "var(--color-book)",    icon: "📚" },
  { id: "movie",   label: "Movie",    color: "var(--color-movie)",   icon: "🎬" },
  { id: "tv",      label: "TV",       color: "var(--color-tv)",      icon: "📺" },
  { id: "podcast", label: "Podcast",  color: "var(--color-podcast)", icon: "🎙️" },
  { id: "youtube", label: "YouTube",  color: "var(--color-youtube)", icon: "▶️" },
  { id: "article", label: "Article",  color: "var(--color-article)", icon: "📄" },
  { id: "tweet",   label: "Tweet",    color: "var(--color-tweet)",   icon: "𝕏" },
] as const;

export const STATUSES = [
  { id: "suggestions", label: "Suggestions", color: "var(--color-suggestions)" },
  { id: "in_progress", label: "In Progress", color: "var(--color-in-progress)" },
  { id: "finished",    label: "Finished",    color: "var(--color-finished)"    },
  { id: "archived",    label: "Archived",    color: "var(--color-archived)"    },
] as const;

export const SEARCHABLE_EXTERNAL_TYPES = ["book", "movie", "tv", "podcast"] as const;

export const AUTO_DETECT_SOURCES = [
  {
    type: "youtube",
    label: "YouTube",
    examples: ["youtube.com/watch?v=...", "youtu.be/..."],
  },
  {
    type: "movie",
    label: "Movies / TV",
    examples: ["themoviedb.org/movie/...", "themoviedb.org/tv/..."],
  },
  {
    type: "book",
    label: "Books",
    examples: ["goodreads.com/...", "openlibrary.org/...", "google.com/books/..."],
  },
  {
    type: "podcast",
    label: "Podcasts",
    examples: ["podcasts.apple.com/...", "anchor.fm/...", "buzzsprout.com/...", "podbean.com/..."],
  },
  {
    type: "tweet",
    label: "Tweets",
    examples: ["x.com/.../status/...", "twitter.com/.../status/..."],
  },
  {
    type: "article",
    label: "Articles",
    examples: ["Any other URL falls back to article scraping"],
  },
] as const;

export type ContentTypeId = typeof CONTENT_TYPES[number]["id"];
export type StatusId = typeof STATUSES[number]["id"];
