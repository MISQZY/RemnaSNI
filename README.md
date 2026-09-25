# RemnaSNI

Self-SNI stub site for the nodes: a flag clicker game. Tap the node country's flag, earn points, buy upgrades.
Progress lives in the visitor's `localStorage`; after signing in with Telegram it is also synced to RemnaWeb.

## Config

| Variable       | Description                                              |
| -------------- | -------------------------------------------------------- |
| `NODE_COUNTRY` | ISO 3166-1 alpha-2 code (`de`, `nl`, `fi`, …). Read at request time, so one image fits every node. Invalid or missing → neutral flag. |
| `REMNAWEB_URL` | RemnaWeb URL. Enables "Sign in with Telegram" and progress sync; empty → sign-in is hidden. |
| `PORT`         | Host port for `docker-compose.yml` (bound to `127.0.0.1`). |

## Telegram sign-in

RemnaWeb runs the Telegram OAuth (OIDC) flow, so nodes hold no secrets:

1. The site sends the player to `REMNAWEB_URL/api/sni/auth/start?return_to=<this page>`.
2. RemnaWeb signs them in with Telegram and redirects back with `#sni_token=…`; the site keeps it in `localStorage`.
3. The site pulls progress from `/api/sni/progress` and pushes changes every 10 s and when the tab hides.
   Each country keeps its own progress (`?country=de`); the one further along wins (later reset → more earned → more spent).

### Traffic boost

RemnaWeb sums the player's traffic through the nodes of this country over the last 30 days and returns a boost of
`min(10, log2(1 + GB))` auto-taps per second (1 GB → ×1, 7 GB → ×3, 1 TB → ×10). The site credits
`points per tap × boost` every second, also for the time the tab was closed (up to 8 hours), and refreshes the boost
every 5 minutes. Signed-out players tap by hand only.

On the RemnaWeb side set `TELEGRAM_LOGIN_CLIENT_SECRET` and add this site's origin to `SNI_ORIGINS`.

## Run on a node

Every push to `main` builds `ghcr.io/misqzy/remnasni` (`latest` and the short commit SHA) via
`.github/workflows/image.yml`. The same image serves every node, so a node only needs `docker-compose.yml` and `.env`:

```sh
cp .env.example .env   # set NODE_COUNTRY, REMNAWEB_URL
docker compose pull && docker compose up -d
```

The package is private by default: either make it public (GitHub → Packages → remnasni → Package settings) or run
`docker login ghcr.io` on the node with a token that has `read:packages`. Without registry access
`docker compose up -d --build` builds the image on the node instead.

The container serves plain HTTP on `127.0.0.1:$PORT`. Terminate TLS for the node's domain in front of it
(nginx / caddy) and point Xray REALITY `target` + `serverNames` at that domain.

## Development

```sh
npm install
NODE_COUNTRY=de npm run dev
```
