import { readdirSync } from "node:fs";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The core knows no game, and a game imports no other one nor the registry of them all (src/games/index.ts, site.ts):
// a node loads the code of its own game only.
const games = readdirSync(new URL("./src/games", import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const forbid = (group, message, names = []) => ({
  "no-restricted-imports": ["error", { paths: names.map((name) => ({ name, message })), patterns: [{ group, message }] }],
});

const boundaries = [
  { files: ["src/core/**"], rules: forbid(["@/games", "@/games/*", "@/app/*", "@/i18n/*"], "The core must not depend on a game, the registry or a route.") },
  ...games.map((game) => ({
    files: [`src/games/${game}/**`],
    rules: forbid(
      games.filter((other) => other !== game).map((other) => `@/games/${other}/*`),
      "A game must not import another game or the registry; move what they share to src/core.",
      ["@/games", "@/games/index", "@/games/site"],
    ),
  })),
];

const config = [...nextVitals, ...nextTs, ...boundaries, { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] }];

export default config;
