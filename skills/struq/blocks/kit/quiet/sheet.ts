// components/struq/kit/quiet/sheet.ts (Struq recipe)
// The sheet the quiet scenes stand on: the page's 12 column grid inside the page margin (the header wordmark's and the
// heroes' left edge) with the one gutter, and the margin label. Tokens from blocks.css only.

/** The page grid: 12 columns, the sheet's gutter, the sheet's page margin. Phones keep the 12 columns. */
export const SHEET_GRID = "grid grid-cols-12 gap-x-sheet-gutter px-sheet-margin";

/** A quiet scene's breathing room above and below. */
export const SCENE_SPACE = "py-28 md:py-40";

/** The margin label: small, body face, sentence case, muted. Beside a headline or under a photo, never above a heading. */
export const LABEL = "m-0 font-body text-sheet-label text-ink-muted";
