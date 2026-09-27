# RemnaSNI

Self-SNI stub site for the nodes: a flag clicker game. Tap the node country's flag, earn points, buy upgrades.
Progress lives in the visitor's `localStorage`; after signing in with Telegram it is also synced to RemnaWeb.

## Config

| Variable       | Description                                              |
| -------------- | -------------------------------------------------------- |
| `GAME`         | The game this node runs: `clicker` (the flag clicker, the default) or `snake` (a prototype: every crystal eaten brings Qzr to the country balance right away, each one worth more than the last — `50 + 25 × collected`, set in RemnaWeb, plus 50% per unit of the country's turbo; Qzr keys come harder and harder (the k-th at 100 × k² crystals in total), shared with the clicker, and which buys the snake's bonuses: golden crystals, a second life, a slower speed-up; without sign-in they are kept on the device and credited after it, via RemnaWeb `/api/sni/snake`). RemnaWeb asks every site `GET /api/sni/game` and lists the node under its game in the Mini App, where players pick the game they earn Qzr in. Unknown values fall back to `clicker`. |
| `NODE_COUNTRY` | ISO 3166-1 alpha-2 code (`de`, `nl`, `fi`, …). Read at request time, so one image fits every node. Invalid or missing → neutral flag. |
| `REMNAWEB_URL` | RemnaWeb URL (https; http only for localhost), required: the game rules come from it (see below). Also enables "Sign in with Telegram" and progress sync. Used by the server only: pages never see it. |
| `SITE_FOOTER`  | Optional footer text (`© <year> <text>`). Empty by default, so nothing on the page ties the nodes together. |
| `FRAME_ANCESTORS` | For Caddy: who may open the site in a frame, e.g. `https://app.example.com https://web.telegram.org https://*.telegram.org` (the RemnaWeb origin and Telegram's web clients that frame it). Enables "Играть" right in the Mini App: the site then gets the Mini App user's session from RemnaWeb by `postMessage`. Empty → nobody. |
| `PORT`         | Host port for `docker-compose.yml` (bound to `127.0.0.1`). |

## Game rules

RemnaWeb is the source of truth for the game: upgrades (prices, effects, icons), achievements (conditions as data),
their names and descriptions in both languages, crit and offline-income constants and the pinned-pet limit all live in
`RemnaWeb/src/lib/clicker/config.ts`. The server fetches them from `REMNAWEB_URL/api/sni/config`
(`lib/config-server.ts`), refreshes them every 5 minutes and keeps serving the last ones while RemnaWeb is down; until
they have been fetched once the site shows a "temporarily unavailable" stub. So a balance or text change in RemnaWeb
reaches every node without a redeploy. What stays here is code: `lib/rules.ts` applies the config and mirrors
`RemnaWeb/src/lib/clicker/rules.ts` — a new rule type or formula has to be added to both.

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

### Pets

Signed-in players can adopt pets in the shop (`/pets`) with this country's points, any number of the same kind.
RemnaWeb owns the catalog, prices, serial numbers and the upgrader: rarity belongs to each pet, the shop sells a kind at
its own rarity, and every pet is numbered within the series of its kind and rarity (limited: rare 300, epic 75,
legendary 15, mythic 3, cosmic 1). The upgrader in "My pets" (`POST /api/sni/pets/upgrade`, body `{ pet }`) raises a
pet's rarity by one with a falling chance (50% from common down to 3% from mythic); on failure the pet is gone and its
number goes back to the shop. The catalog, owned pets and rarities come with `/api/sni/progress`; buying calls
`POST /api/sni/pets?country=xx`. Up to `maxPinnedPets` pets (from the config) can be pinned in "My pets" (`PATCH /api/sni/pets`, body `{ pet, pinned }`);
pinned pets fly around the profile on the RemnaWeb Mini App home page. The `.pet` animations in
`globals.css` and `components/pet-sprite.tsx` are mirrored in RemnaWeb.

### Moves and endless achievements

"Move to a new SNI" (prestige, `components/prestige.tsx`) trades points and upgrade levels for encryption keys; each key
adds income for good and free keys buy perks. Endless achievement ladders (`components/achievements.tsx`) add tiers without
end, and every achievement or tier adds income too. Formulas are in `lib/rules.ts`, mirroring RemnaWeb. A tap effect bought
in the RemnaWeb Mini App shop comes with `/api/sni/progress` as `effect` and replaces the mini flags thrown by a tap.

On the RemnaWeb side set `TELEGRAM_LOGIN_CLIENT_SECRET` and add this site's origin to `SNI_ORIGINS`.

## Languages

English by default, Russian as well; the language button in the header switches between them and the choice is kept
in the `lang` cookie, so the server renders the page in it. All interface strings are in `src/lib/i18n/en.ts` and
`ru.ts` (typed by the English one, so a missing translation fails the build). Country names come from
`Intl.DisplayNames`; pet, upgrade and achievement names and descriptions arrive from RemnaWeb in both languages.

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
   cp .env.example .env && chmod 600 .env   # set NODE_COUNTRY, REMNAWEB_URL, DOMAIN, CF_API_TOKEN
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
NODE_COUNTRY=de npm run dev
```
