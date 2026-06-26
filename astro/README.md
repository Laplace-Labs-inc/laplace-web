# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

<!-- ASTRO:REMOVE:START -->

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

<!-- ASTRO:REMOVE:END -->

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🔧 Environment contract (waitlist + docs search)

Two features read build-time `PUBLIC_*` env vars (see [`.env.example`](./.env.example)).
Copy it to `.env.local` (gitignored) to enable them. When the vars are unset each
feature degrades to an **honest explicit gate** (visibly disabled / "coming soon"),
never a silently-broken stub.

| Feature | Env vars | Behaviour when set | Behaviour when unset |
| :------ | :------- | :----------------- | :------------------- |
| Waitlist (`src/components/landing/WaitlistForm.tsx`) | `PUBLIC_WAITLIST_ENDPOINT` | Real `POST {"email":"..."}` (JSON, expects 2xx) with loading/success/error states | Disabled input + `mailto:` fallback; no fake "success" |
| Docs search (`src/components/Search.astro`) | `PUBLIC_ALGOLIA_APP_ID`, `PUBLIC_ALGOLIA_SEARCH_KEY`, `PUBLIC_ALGOLIA_INDEX_NAME` | Algolia DocSearch initialised on the docs pages | Disabled "Search docs (coming soon)" box |

Notes:
- All values are **public** (the `PUBLIC_` prefix inlines them into client JS).
  Use only public-safe values — for Algolia, the **search-only** key, never an
  admin/write key. The waitlist endpoint is a public POST URL, not a credential.
- On the gated (unset) path, DocSearch JS/CSS is tree-shaken out and the waitlist
  makes no network calls.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
