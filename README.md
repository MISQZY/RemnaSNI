# RemnaSNI

Self-SNI stub site for the nodes: one of the infrastructure games — the clicker, the snake, the fishing or the crash. RemnaWeb is the
orchestrator: it picks the node's game and country and sends the rules; the site only plays.
Progress lives in the visitor's `localStorage`; after signing in with Telegram it is also synced to RemnaWeb.
Achievements and pets are not here: both are the profile's, in the RemnaWeb Mini App.

## Config

| Variable       | Description                                              |
| -------------- | -------------------------------------------------------- |
| `DOMAIN`       | The node's domain: Caddy serves it, and the site names itself by it to RemnaWeb, which tells the game and the country (see below). |
| `REMNAWEB_URL` | RemnaWeb URL (https; http only for localhost), required: the game, the country and the game rules come from it (see below). Also enables "Sign in with Telegram" and progress sync. Used by the server only: pages never see it. |
| `SITE_FOOTER`  | Optional footer text (`© <year> <text>`). Empty by default, so nothing on the page ties the nodes together. |
| `FRAME_ANCESTORS` | For Caddy: who may open the site in a frame, e.g. `https://app.example.com https://web.telegram.org https://*.telegram.org` (the RemnaWeb origin and Telegram's web clients that frame it). Enables "Играть" right in the Mini App: the site then gets the Mini App user's session from RemnaWeb by `postMessage`. Empty → nobody. |
| `PORT`         | Host port for `docker-compose.yml` (bound to `127.0.0.1`). |

## Game and country

RemnaWeb decides what the node runs. The server asks `REMNAWEB_URL/api/sni/site` with `x-sni-site: <DOMAIN>` and gets
`{ game, country }` (`src/core/site.ts`): the game an admin picked for this site in RemnaWeb (Админка → Игра → Игровые
сайты; the clicker until one is picked) and the country of the panel host with this domain as its SNI. The answer
is kept for a minute, so a switch in RemnaWeb reaches the node without a redeploy; while RemnaWeb is down the last one
keeps serving. The API proxy passes `x-sni-site` with every call, so RemnaWeb keeps progress in that country whatever
the page asks. `GAME` and `NODE_COUNTRY` in `.env` are deprecated: they are used only while RemnaWeb cannot tell (an
older RemnaWeb, a host it does not know, no `DOMAIN` in development).

The snake (a prototype): every crystal eaten brings Qzr to the country balance right away, each one worth more than the
last, plus 50% per unit of the country's turbo; Qzr keys come harder and harder, shared with the clicker, and buy the
snake's bonuses: golden crystals, a second life, a slower speed-up. Without sign-in the runs are kept on the device and
credited after it, via RemnaWeb `/api/sni/snake`.

The fishing: cast, wait for the bite and hook it in time (a tap too early scares the fish, a late one misses it),
then reel it in by holding: the catch zone rises while held and sinks otherwise, and the fish must stay in it, or it
breaks free (`src/games/fishing/reel.ts`). Rarer fish fight harder. Signed in, RemnaWeb rolls the fish when the line
is cast and tells the site only how hard it pulls; the landed fish is sold for Qzr to the country balance, its price
growing with the fish caught there, plus the turbo, and brings Qzr keys shared with the other games, which buy the
fishing's bonuses (lure, strong line, groundbait). Without sign-in the fish are rolled on the device for fun and
not sold, since nothing proves they were caught.

The crash: Qzr bet before a round, then a multiplier grows until the round crashes at a point RemnaWeb rolled and keeps
to itself; a bet cashed out before that (by hand or at its own auto cash-out) comes back multiplied, the rest burn.
RemnaWeb runs the rounds, one for every viewer of every site that runs the crash, and the page follows them through
`/api/sni/crash/stream` (server-sent events, passed through by the API proxy as a stream): the state on every change
and RemnaWeb's clock, so the curve runs in step everywhere. A round is colored by its multiplier, as the pets'
rarities, grey to cosmic; the last ten are listed above the chart. Watching needs no account, betting does.

## Games and routes

Every game lives in its own route subtree, `src/app/games/<id>`, with its own layout and title; the root layout holds
only what all share (fonts, language, footer, toasts). `src/proxy.ts` gets the game at request time and rewrites the
public paths to the node's game (`/` → `/games/clicker`, `/games/snake`, `/games/fishing` or `/games/crash`); the `/games/...` paths themselves are
404. So a node loads the JS of its own game only. The API proxy passes the calls of every game in the registry, so
a tab left open on the previous game keeps saving after an admin switches the node's game in RemnaWeb.

## Code layout

```
src/core/           what every game uses; knows no game
  games.ts          the registry: ids, public routes and RemnaWeb API calls of each game
  site.ts           the node's game and country from RemnaWeb
  country.ts        the node's country named in a language
  remnaweb.ts       REMNAWEB_URL and remoteValue(), the cache of what the server asks RemnaWeb for
  remote-config.ts  remoteConfig(): a game's rules from GET /api/sni/config, refreshed every minute
  page.ts           nodePage() for a game's layout/page, gameMetadata() for its title
  session.ts        the Telegram session: sign-in, the Mini App frame, sign-out here and everywhere
  api.ts            RemnaWeb's /api/sni/* as the player: token, country, a 401 signs out, ApiError
  storage.ts        localStorage/sessionStorage that never throws, under the `remnasni:` prefix
  look.ts           profile cosmetics as CSS
  format.ts         numbers, bytes, durations
  use-game-status.ts  useGameStatus(): a game's status from RemnaWeb, loaded on session start and sign-in
  i18n/             next-intl: locales, catalogs, request config, provider, useFormat, LanguageSwitch, tr()
  ui/               SiteHeader, AccountMenu (+ SignInButton, MenuButton), PerkShop (bonuses for keys, key bar),
                    StatTile, ProfileAvatar, Unavailable, Qzr and key icons
src/games/<id>/     one game: its rules, state and components
src/app/            routes only: app/games/<id>, the API proxy, the favicon
messages/<scope>/   catalogs: core/ and one per game, each with its own top-level namespaces
```

ESLint enforces the boundaries: `src/core` imports no game, a game imports no other game.

A new game: its code in `src/games/<id>` (rules loaded with `remoteConfig`, the page built from `nodePage`,
`SiteHeader` and `AccountMenu`, the status through `useGameStatus`, bonuses through `PerkShop`, calls through `api`,
storage through `storage`), its pages in `src/app/games/<id>`,
its texts in `messages/<id>/{en,ru}.json` listed in `src/core/i18n/messages.ts`, and its entry in `src/core/games.ts`
(and RemnaWeb's `lib/games.ts`).

## Game rules

RemnaWeb is the source of truth for the clicker: upgrades (prices, effects, icons), prestige perks, their names and
descriptions in both languages, crit and offline-income constants all live in
`RemnaWeb/src/lib/clicker/config.ts`. The server fetches them from `REMNAWEB_URL/api/sni/config`
(`src/games/clicker/config-server.ts`), refreshes them every minute and keeps serving the last ones while RemnaWeb is down; until
they have been fetched once the site shows a "temporarily unavailable" stub. So a balance or text change in RemnaWeb
(an admin tunes the numbers in Админка → Игра → Настройки) reaches every node within a minute, without a redeploy. What stays here is code: `src/games/clicker/rules.ts` applies the config and mirrors
`RemnaWeb/src/lib/clicker/rules.ts` — a new rule type or formula has to be added to both.

The snake's rules come with them, under `snake` (`RemnaWeb/src/lib/snake-rules.ts`): the board size, the start and
fastest step, the speed-up per crystal, the crystal price and the golden multiplier. RemnaWeb derives its run checks from
the same numbers, so the site and the checks never disagree; without them (an older RemnaWeb) the snake shows the stub.

The fishing's come under `fishing` (`RemnaWeb/src/lib/fishing-rules.ts`): the time to hook, the catch zone and how
fast the progress fills and drains, the price formula and the species with their names, sizes and strength (for play
without an account). The fight itself is code here (`reel.ts`); RemnaWeb accepts a catch no sooner than the bite plus
its shortest fight, which the reel can never beat (it starts at 0.3 and fills at most at `fillPerSec`).

The crash's come under `crash` (`RemnaWeb/src/lib/crash-rules.ts`): how long bets are taken and a crash is shown, how
fast the multiplier grows, the highest one, the smallest bet and auto cash-out, and where each color starts. The crash
points themselves never leave RemnaWeb before the crash, and whether a cash-out came in time is up to its clock.

## Telegram sign-in

RemnaWeb runs the Telegram OAuth (OIDC) flow, so nodes hold no secrets. Pages talk to this site's own
`/api/sni/*` (`app/api/sni/[...path]/route.ts`), which passes the calls on to RemnaWeb from the server:
the HTML never names RemnaWeb, and the browser meets it only when the player signs in.

1. The site sends the player to its `/api/sni/auth/start?return_to=<this page>&state=<random>`, which redirects
   to RemnaWeb; `state` stays in `sessionStorage`.
2. RemnaWeb signs them in with Telegram and redirects back with `#sni_token=…&sni_state=…`; the token is kept in
   `localStorage` only when `sni_state` matches, so a token planted in a link is refused. Sessions last 30 days and are
   renewed while the player keeps coming back; "Sign out on all devices" revokes every session of the account.
3. The site pulls progress from `/api/sni/progress` and pushes changes every 10 s (not while the tab is hidden, and
   backing off after failures) and when the tab hides. RemnaWeb checks every save (see its README); progress it rejects
   as impossible replaces the local one.
   Each country keeps its own progress (`?country=de`); the one further along wins (later reset or move → more earned → more RemnaWeb purchases and sales seen → more spent).

### Traffic boost

RemnaWeb sums the player's traffic through the nodes of this country over the last 30 days and returns a boost of
`min(3, log10(1 + GB))` auto-taps per second (10 GB → ×1, 100 GB → ×2, 1 TB → ×3). The site credits
`points per tap × boost` every second, half of that for the time the tab was closed (up to 8 hours), and refreshes the boost
every 5 minutes. Signed-out players tap by hand only. The page itself calls it the turbo and never mentions traffic.

### Human checks

Every few thousand taps RemnaWeb stops saving progress until the player taps the named emoji among six
(`src/games/clicker/human-check.tsx` over the flag, `/api/sni/challenge`); taps do not count meanwhile. `tap-guard.ts`
ignores scripted events and held keys and asks for a check at once on machine-like tapping (steady rhythm, touches on
one pixel, 20 minutes without a pause). Signed out, the site gives the checks itself (`human.ts`); the progress
made meanwhile still meets RemnaWeb's check at the first save.

### Prestige

Prestige (`src/games/clicker/prestige.tsx`) trades Qzr and upgrade levels for Qzr keys; each key adds income for good and free
keys buy perks. Keys are shared with the other games: RemnaWeb counts those they brought and spent (`keysShopEarned`,
`keysShopSpent` in the progress), and the free ones are the same everywhere. Formulas are in `rules.ts`, mirroring RemnaWeb. A tap effect bought
in the RemnaWeb Mini App shop comes with `/api/sni/progress` as `effect` and replaces the mini flags thrown by a tap;
the color of the tap numbers comes as `tapColor` (CSS, `src/core/look.ts`). The snake gets its bought skin (canvas colors)
and the particles of an eaten crystal with `GET /api/sni/snake` as `snake.skin` and `snake.effect`.

The profile's other cosmetics from that shop — the title, the avatar frame, the name color and the glow — come with
the player (`user.look` of `/api/sni/progress` and `/api/sni/snake`) as plain CSS, so a new look needs no redeploy here;
`src/core/ui/profile-avatar.tsx` draws them with `src/core/look.ts`, and the look-* keyframes of `globals.css` animate them.

On the RemnaWeb side set `TELEGRAM_LOGIN_CLIENT_SECRET` and add this site's origin to `SNI_ORIGINS`.

## Languages

English by default, Russian as well, through `next-intl` (ICU MessageFormat: plurals, placeholders, tags). The language
button in the header switches between them and the choice is kept in the `lang` cookie, so the server renders the page
in it; the RemnaWeb Mini App passes its language as `?lang=` (`src/proxy.ts`). Interface strings are in
`messages/<scope>/en.json` and `ru.json` (`core` and one per game, merged in `src/core/i18n/messages.ts`): the English catalogs type the keys and arguments (`src/global.d.ts`), and
`npm test` checks that both languages have the same keys, parse as ICU and take the same arguments, and that scopes share no namespace. Code outside React
(sync, toasts of the game loop) translates through `src/core/i18n/client.ts`. A page gets the core messages and its game's only
(`pageMessages`, handed over by the game's layout), from the server: no catalog is bundled into the JS.

The API proxy (`app/api/sni/[...path]`) passes the page's language to RemnaWeb as `x-locale`, so its answers and errors
come in it. Country names come from `Intl.DisplayNames`; upgrade and perk names and descriptions arrive from RemnaWeb
in both languages, snake bonuses in the page's language.

## Run on a node

```
Browser → :443 Xray REALITY → 127.0.0.1:8443 Caddy (TLS) → 127.0.0.1:$PORT site
```

CI builds two images, the same for every node:

| Image | Workflow | When |
| ----- | -------- | ---- |
| `ghcr.io/misqzy/remnasni` — the site | `image.yml` | every push to `main` |
| `ghcr.io/misqzy/remnasni-caddy` — Caddy with the Cloudflare DNS module | `caddy.yml` | changes in `caddy/`, monthly, manually |

A node needs only `docker-compose.yml`, `Caddyfile` and `.env`. Caddy gets the certificate through Cloudflare DNS
(DNS-01), so port 80 stays closed, and listens on `127.0.0.1:8443` only. It compresses responses, sets the security
headers (CSP, HSTS, `X-Frame-Options` and others) and drops its `Server` header. Only requests for a frame
(`Sec-Fetch-Dest: iframe`) get `frame-ancestors` from `FRAME_ANCESTORS`; a direct visit sees `DENY` and no origins. The Caddy images are pinned by digest
and the Cloudflare module by version (`caddy/Dockerfile`); Dependabot proposes image updates.

1. **Cloudflare**: an `A` record for the node's domain → node IP, **DNS only** (grey cloud). An API token with
   `Zone:Read` + `DNS:Edit` for the zone (one token can serve every node).
2. **Files** (repo and images are public, no GitHub token needed):
   ```sh
   sudo mkdir -p /opt/remnasni && sudo chown "$USER": /opt/remnasni && cd /opt/remnasni
   for f in docker-compose.yml Caddyfile .env.example; do
     curl -fsSLO "https://raw.githubusercontent.com/MISQZY/RemnaSNI/main/$f"
   done
   cp .env.example .env && chmod 600 .env   # set REMNAWEB_URL, DOMAIN, CF_API_TOKEN
   ```
3. **Run**:
   ```sh
   docker compose pull && docker compose up -d
   docker logs -f remnasni-caddy    # wait for "certificate obtained successfully"
   ```
4. **Remnawave panel**: REALITY `target` = `127.0.0.1:8443`, the node's domain in `serverNames`
   (all nodes' domains if they share the config profile), and the same domain as the host's SNI.
5. **RemnaWeb**: the domain must match `SNI_ORIGINS`.

Update: `docker compose pull && docker compose up -d`. Certificates live in the `caddy_data` volume and are renewed by
Caddy.

## Development

```sh
npm install
GAME=clicker NODE_COUNTRY=de npm run dev   # no DOMAIN: the game and country come from .env
npm test
```
