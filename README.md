# Twitch Username Checker

A simple app to check if a Twitch username is available. Built with React, TypeScript, and Vite. Uses a Cloudflare Worker as a lightweight proxy to the official Twitch Helix API.

## Features

- Check if a Twitch username is available or taken
- Search on button click or pressing Enter
- Stores last 5 checked usernames locally in your browser
- No database or backend required, history never leaves your device

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Cloudflare Workers](https://workers.cloudflare.com/) (API proxy)
- [Twitch Helix API](https://dev.twitch.tv/docs/api/)
- Hosted on [GitHub Pages](https://pages.github.com/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v24 or higher)
- [pnpm](https://pnpm.io/)
- A [Twitch Developer](https://dev.twitch.tv/console) account with a registered app (Confidential client type)
- A [Cloudflare](https://cloudflare.com/) account

### Cloudflare Worker Setup

The app requires a Cloudflare Worker to securely proxy requests to the Twitch API, keeping your credentials server-side.

1. Create a new Worker in the Cloudflare dashboard
2. Paste the following code:

```javascript
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const username = url.searchParams.get("login");

    if (!username) {
      return new Response(JSON.stringify({ error: "Missing login param" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${env.CLIENT_ID}&client_secret=${env.CLIENT_SECRET}&grant_type=client_credentials`,
    });
    const { access_token } = await tokenRes.json();

    const userRes = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": env.CLIENT_ID,
        },
      },
    );
    const data = await userRes.json();

    return new Response(JSON.stringify({ exists: data.data.length > 0 }), {
      headers: corsHeaders,
    });
  },
};
```

3. In the Worker's **Settings → Variables and Secrets**, add:
   - `CLIENT_ID` — your Twitch app's Client ID (plain text or **encrypted secret**)
   - `CLIENT_SECRET` — your Twitch app's Client Secret (**encrypted secret**)

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/mauduong/twitch-username-checker.git
   cd twitch-username-checker
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file in the project root:

   ```
   VITE_WORKER_URL=https://your-worker.your-name.workers.dev
   ```

4. Start the dev server:
   ```bash
   pnpm run dev
   ```

### Deployment (GitHub Pages)

Deployment is automated via GitHub Actions on every push to `main`.

1. Add your Worker URL as a repository secret:
   - Go to your repo → **Settings → Secrets and variables → Actions**
   - Add `VITE_WORKER_URL` with your Worker URL as the value

2. Push to `main` — the workflow will build and deploy automatically.

To deploy manually instead:

```bash
pnpm run build
pnpm exec gh-pages -d dist
```

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes
4. Commit with a descriptive message: `git commit -m "add: your feature description"`
5. Push to your fork: `git push origin feat/your-feature-name`
6. Open a Pull Request

Please keep PRs focused — one feature or fix per PR makes review much easier.

### Ideas for Contributions

- Bulk username checking (check multiple at once)
- Export history to clipboard or CSV
- Keyboard shortcuts
- Accessibility improvements
- Unit tests

## License

[MIT](./LICENSE)
