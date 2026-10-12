/** What takes Space and Enter for itself: a key pressed on one of these is its own, not the game's. */
const CONTROLS = "input, textarea, select, button, a[href], [role=button], [role=menu], [role=menuitem], [role=dialog], [contenteditable]";

/** Whether the key went to a control on the page (a focused button, a field, an open menu) rather than to the game. */
export const fromControl = (e: KeyboardEvent): boolean => !!(e.target instanceof Element && e.target.closest(CONTROLS));
