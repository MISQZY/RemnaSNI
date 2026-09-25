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
`min(3, log10(1 + GB))` auto-taps per second (10 GB → ×1, 100 GB → ×2, 1 TB → ×3). The site credits
`points per tap × boost` every second, half of that for the time the tab was closed (up to 8 hours), and refreshes the boost
every 5 minutes. Signed-out players tap by hand only.

On the RemnaWeb side set `TELEGRAM_LOGIN_CLIENT_SECRET` and add this site's origin to `SNI_ORIGINS`.

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
(DNS-01), so port 80 stays closed, and listens on `127.0.0.1:8443` only.

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
