# OneDayCap Website

Next.js site for **onedaycap.com**, built to deploy on **GitHub** and **Vercel** with interactive CTA components.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Vercel** (hosting)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**If you get `EPERM: operation not permitted` on port 3000** (e.g. in Cursor’s terminal), run the same commands from your **system terminal** (Terminal.app or iTerm):

```bash
cd "/Users/Sree/projects/OneDayCap Website"
npm run dev
```

Or run the helper script: `./start-dev.sh` (after `chmod +x start-dev.sh` once).

## Deploy with GitHub + Vercel

### 1. Create a GitHub repo

1. Go to [github.com](https://github.com) and sign in.
2. Click **New** (or **+** → **New repository**).
3. Name it (e.g. `onedaycap-website`), choose **Public**, leave “Add a README” unchecked.
4. Click **Create repository**. Leave the page open — you’ll need the repo URL.

### 2. Push this project to GitHub

In your terminal, from this project folder:

```bash
cd "/Users/Sree/Downloads/OneDay Capital/OneDayCap Website"

git init
git add .
git commit -m "Initial commit: OneDay Capital site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username and `REPO_NAME` with the repo name (e.g. `onedaycap-website`). If GitHub prompts for auth, use a Personal Access Token or SSH.

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with **GitHub**.
2. Click **Add New…** → **Project**.
3. **Import** the repository you just pushed (e.g. `onedaycap-website`).
4. Leave the framework as **Next.js** (Vercel will detect it). Click **Deploy**.
5. When the build finishes, your site is live at `https://your-project.vercel.app`.

### 4. (Optional) Add custom domain onedaycap.com

1. In the Vercel project: **Settings** → **Domains**.
2. Add **onedaycap.com** (and optionally **www.onedaycap.com**).
3. Vercel will show DNS records. In your domain registrar (e.g. Namecheap, Cloudflare, GoDaddy):
   - Add the **A** record: `76.76.21.21` (or the IP Vercel shows).
   - Or add the **CNAME** they provide for `www` (e.g. `cname.vercel-dns.com`).
4. Wait for DNS to propagate (minutes to 48 hours). Vercel will issue SSL automatically.

## Project structure

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── CTAButton.tsx
├── vercel.json
├── package.json
└── README.md
```

## Interactive CTAs

Use `components/CTAButton.tsx` for primary actions:

- **As button:** `<CTAButton variant="primary">Submit</CTAButton>`
- **As link:** `<CTAButton href="/signup" variant="primary">Sign up</CTAButton>`
- **Variants:** `primary` | `secondary` | `outline` | `ghost`
- **Sizes:** `sm` | `md` | `lg`

## Scripts

| Command   | Description              |
|----------|--------------------------|
| `npm run dev`   | Start dev server        |
| `npm run build` | Production build        |
| `npm run start` | Run production build    |
| `npm run lint`  | Run ESLint              |
