# RemnaSNI

Self-SNI stub site for the nodes: one of the infrastructure games — the flag clicker or the snake. RemnaWeb is the
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
`{ game, country }` (`lib/site-game.ts`): the game an admin picked for this site in RemnaWeb (Админка → Игра → Игровые
сайты; the flag clicker until one is picked) and the country of the panel host with this domain as its SNI. The answer
is kept for a minute, so a switch in RemnaWeb reaches the node without a redeploy; while RemnaWeb is down the last one
keeps serving. The API proxy passes `x-sni-site` with every call, so RemnaWeb keeps progress in that country whatever
the page asks. `GAME` and `NODE_COUNTRY` in `.env` are deprecated: they are used only while RemnaWeb cannot tell (an
older RemnaWeb, a host it does not know, no `DOMAIN` in development).

The snake (a prototype): every crystal eaten brings Qzr to the country balance right away, each one worth more than the
last, plus 50% per unit of the country's turbo; Qzr keys come harder and harder, shared with the clicker, and buy the
snake's bonuses: golden crystals, a second life, a slower speed-up. Without sign-in the runs are kept on the device and
credited after it, via RemnaWeb `/api/sni/snake`.

## Games and routes

Every game lives in its own route subtree, `src/app/games/<id>`, with its own layout; the root layout holds only what all
share (fonts, language, footer, toasts). `src/proxy.ts` gets the game at request time and rewrites the public paths to the
node's game (`/` → `/games/clicker` or `/games/snake`); the `/games/...` paths themselves are 404. So a node loads the JS
of its own game only. The Telegram session (`lib/session.ts`) is shared and imports no game; a game must not import
another one. A new game: its folder under `src/app/games`, its id in `lib/site-game.ts` and `ROUTES` in the proxy.

## Game rules

RemnaWeb is the source of truth for the clicker: upgrades (prices, effects, icons), prestige perks, their names and
descriptions in both languages, crit and offline-income constants all live in
`RemnaWeb/src/lib/clicker/config.ts`. The server fetches them from `REMNAWEB_URL/api/sni/config`
(`lib/config-server.ts`), refreshes them every minute and keeps serving the last ones while RemnaWeb is down; until
they have been fetched once the site shows a "temporarily unavailable" stub. So a balance or text change in RemnaWeb
(an admin tunes the numbers in Админка → Игра → Настройки) reaches every node within a minute, without a redeploy. What stays here is code: `lib/rules.ts` applies the config and mirrors
`RemnaWeb/src/lib/clicker/rules.ts` — a new rule type or formula has to be added to both.

The snake's rules come with them, under `snake` (`RemnaWeb/src/lib/snake-rules.ts`): the board size, the start and
fastest step, the speed-up per crystal, the crystal price and the golden multiplier. RemnaWeb derives its run checks from
the same numbers, so the site and the checks never disagree; without them (an older RemnaWeb) the snake shows the stub.

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
(`components/human-check.tsx` over the flag, `/api/sni/challenge`); taps do not count meanwhile. `lib/tap-guard.ts`
ignores scripted events and held keys and asks for a check at once on machine-like tapping (steady rhythm, touches on
one pixel, 20 minutes without a pause). Signed out, the site gives the checks itself (`lib/human.ts`); the progress
made meanwhile still meets RemnaWeb's check at the first save.

### Prestige

Prestige (`components/prestige.tsx`) trades Qzr and upgrade levels for Qzr keys; each key adds income for good and free
keys buy perks. Keys are shared with the other games: RemnaWeb counts those they brought and spent (`keysShopEarned`,
`keysShopSpent` in the progress), and the free ones are the same everywhere. Formulas are in `lib/rules.ts`, mirroring RemnaWeb. A tap effect bought
in the RemnaWeb Mini App shop comes with `/api/sni/progress` as `effect` and replaces the mini flags thrown by a tap.

The profile's other cosmetics from that shop — the title, the avatar frame, the name color and the glow — come with
the player (`user.look` of `/api/sni/progress` and `/api/sni/snake`) as plain CSS, so a new look needs no redeploy here;
`components/profile-avatar.tsx` draws them with `lib/look.ts`, and the look-* keyframes of `globals.css` animate them.

On the RemnaWeb side set `TELEGRAM_LOGIN_CLIENT_SECRET` and add this site's origin to `SNI_ORIGINS`.

## Languages

English by default, Russian as well, through `next-intl` (ICU MessageFormat: plurals, placeholders, tags). The language
button in the header switches between them and the choice is kept in the `lang` cookie, so the server renders the page
in it; the RemnaWeb Mini App passes its language as `?lang=` (`src/proxy.ts`). Interface strings are in
`messages/en.json` and `messages/ru.json`: the English catalog types the keys and arguments (`src/global.d.ts`), and
`npm test` checks that both catalogs have the same keys, parse as ICU and take the same arguments. Code outside React
(sync, toasts of the game loop) translates through `src/i18n/client.ts`.

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
