# Caddy with the Cloudflare DNS module: certificates via DNS-01, so the node needs no open port 80.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
