/**
 * Classes of a game page's layout. Phones: one column as wide as a phone. Wide screens (lg): the game large on the
 * left, kept in view while the page scrolls, and its blocks (stats, bets, bonuses) one under another on the right.
 * The clicker has a layout of its own.
 */
export const gameLayout = {
  /** The header's width, the same as the page's. */
  header: "max-w-md lg:max-w-5xl",
  main: "mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 pt-4 pb-6 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6",
  /** The game itself: the board, the lake, the chart with what belongs to it. */
  play: "flex flex-col gap-3 lg:sticky lg:top-6 lg:mx-auto lg:w-full",
  /** The right column. On phones its blocks stand in the page's column, around the game. */
  side: "contents lg:flex lg:flex-col lg:gap-3",
  /** A side block shown above the game on phones. */
  above: "max-lg:-order-1",
};
