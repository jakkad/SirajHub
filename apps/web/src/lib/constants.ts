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

export type ContentTypeId = typeof CONTENT_TYPES[number]["id"];
export type StatusId = typeof STATUSES[number]["id"];
