"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False while hydrating, true after: values kept in the browser must not differ from the server's markup. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
