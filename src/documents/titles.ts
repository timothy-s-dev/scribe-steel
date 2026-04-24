interface HasNoun {
  noun: string;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Simple s-suffix pluralizer — the document vocabulary is controlled and
// regular ("encounter sheet", "monster group", "lore book", "handwritten
// document"), so we don't need a real pluralizer.
function pluralize(s: string): string {
  return `${s}s`;
}

export function pageTitle(meta: HasNoun): string {
  return titleCase(meta.noun);
}

export function listTitle(meta: HasNoun): string {
  return titleCase(pluralize(meta.noun));
}

export function errorLabel(meta: HasNoun): string {
  return `Failed to load ${meta.noun}. Try again later.`;
}

export function notFoundLabel(meta: HasNoun): string {
  return `${pageTitle(meta)} not found`;
}

export function signInToViewLabel(meta: HasNoun): string {
  return `Sign in with Google to view custom ${pluralize(meta.noun)}.`;
}

export { titleCase, pluralize };
