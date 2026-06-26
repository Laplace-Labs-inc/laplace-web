# Cloudflare Tunnel — 3 surfaces

The site is split across three subdomains, each served by its own build:

| Subdomain                  | Surface  | Project      | Port |
| -------------------------- | -------- | ------------ | ---- |
| `laplace-labs.com`         | Marketing| `astro/`     | 4321 |
| `docs.laplace-labs.com`    | Docs     | `docs/`      | 4322 |
| `console.laplace-labs.com` | Console  | `frontend/`  | 5173 |

## Local preview behind the tunnel

Start each surface on its mapped port (run in separate shells):

```bash
# 1) marketing
cd astro    && npm run dev -- --port 4321 --host

# 2) docs (Starlight) — second Astro app, so override the port
cd docs     && npm run dev -- --port 4322 --host

# 3) console (Vite already binds --host; default port 5173)
cd frontend && npm run dev
```

Then run the tunnel:

```bash
cloudflared tunnel --config deploy/cloudflared/config.yml run laplace
```

For a quick throwaway URL (no DNS/named tunnel) you can instead point an
ephemeral tunnel at a single port, e.g. `cloudflared tunnel --url http://localhost:4321`.

## Production

Each surface builds to static assets (`npm run build` → `dist/`) and can be
served by any static host or `npm run preview`. The same port mapping applies;
keep the ingress hostnames pointed at wherever those builds are served.

## Theme

All three surfaces share the warm cream / warm dark palette
(`shared/palette.css`). The choice persists per-origin in `localStorage`
(`laplace-theme`); first visit follows the OS `prefers-color-scheme`.
