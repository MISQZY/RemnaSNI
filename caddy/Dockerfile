# Caddy with the Cloudflare DNS module: certificates via DNS-01, so the node needs no open port 80.
# Images pinned by digest and the module by version, so a rebuild never pulls in unreviewed code;
# Dependabot proposes updates of the images, the module version is bumped here by hand.
FROM caddy:2-builder@sha256:369218c81ca6d6af249981221b3a5c764d886dd5b058f51d144066de13f2418d AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare@v0.2.4

FROM caddy:2@sha256:f2a1290d0463aad60660d4ec134943f183ee2a5f6c3eb7bf32dd984f2f020772
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
