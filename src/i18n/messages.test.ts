import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import { LOCALES } from "./locales";
import { MESSAGES } from "./messages";

type Tree = { [key: string]: string | Tree };
type Element = { type: number; value?: string; options?: Record<string, { value: Element[] }>; children?: Element[] };

const leaves = (tree: Tree, prefix = ""): [string, string][] =>
  Object.entries(tree).flatMap(([k, v]) => (typeof v === "string" ? [[`${prefix}${k}`, v] as [string, string]] : leaves(v, `${prefix}${k}.`)));

/** Names of the arguments and tags a message takes, from its ICU syntax tree. */
function args(message: string, locale: string): string[] {
  const names = new Set<string>();
  const walk = (elements: Element[]) => {
    for (const e of elements) {
      // 0 literal and 7 pound carry no name; the rest are arguments, plurals, selects and tags.
      if (e.type !== 0 && e.type !== 7 && e.value) names.add(e.value);
      for (const option of Object.values(e.options ?? {})) walk(option.value);
      if (e.children) walk(e.children);
    }
  };
  walk(new IntlMessageFormat(message, locale).getAst() as Element[]);
  return [...names].sort();
}

describe("message catalogs", () => {
  const reference = new Map(leaves(MESSAGES.en as unknown as Tree));

  for (const locale of LOCALES) {
    const catalog = new Map(leaves(MESSAGES[locale] as unknown as Tree));

    it(`${locale} has exactly the keys of en`, () => {
      expect([...catalog.keys()].sort()).toEqual([...reference.keys()].sort());
    });

    it(`${locale} messages parse as ICU and take the arguments of en`, () => {
      for (const [key, message] of catalog) {
        expect(() => new IntlMessageFormat(message, locale), key).not.toThrow();
        expect(args(message, locale), key).toEqual(args(reference.get(key) ?? "", "en"));
      }
    });
  }
});
