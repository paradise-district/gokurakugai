# Gokurakugai.wiki — Complete Website Management Guide

---

## Table of Contents
1. [How Your Site Works (The Big Picture)](#1-how-your-site-works)
2. [Editing Content & Design](#2-editing-content--design)
3. [Deploying Changes via GitHub](#3-deploying-changes-via-github)
4. [Domain Configuration (gokurakugai.wiki)](#4-domain-configuration)
5. [Firebase Setup & Integration](#5-firebase-setup--integration)
6. [Discord OAuth Integration](#6-discord-oauth-integration)
7. [The Admin Dashboard](#7-the-admin-dashboard)
8. [Social Redirect Links](#8-social-redirect-links)
9. [Adding the Social Links Page](#9-adding-the-social-links-page)
10. [SEO & Metadata Updates](#10-seo--metadata-updates)
11. [Quick-Reference Checklists](#11-quick-reference-checklists)

---

## 1. How Your Site Works

```
gokurakugai.wiki
      │
      ▼
GitHub Pages (paradise-district.github.io)
  └─ Repository: paradise-district/gokurakugai
       ├─ index.html           ← Main single-page app
       ├─ links.html           ← Social links page (new)
       ├─ discord/index.html   ← Redirect → Discord
       ├─ twitter/index.html   ← Redirect → Twitter/X
       ├─ ... (other redirects)
       ├─ CNAME                ← Points GitHub Pages to gokurakugai.wiki
       └─ assets/
            ├─ images/         ← All art, logos, backgrounds, og-image
            └─ favicon/        ← favicon-16.png, favicon-32.png, favicon-180.png
                  │
                  ▼ (reads/writes data)
            Firebase (gokurakugai-community)
                  ├─ Firestore  ← Theories, news posts, applications
                  └─ Storage   ← Gallery images, uploads
```

**GitHub Pages is your host — it's free and static (no server-side code).** Every change
you push to the `main` branch of `paradise-district/gokurakugai` is automatically live
within ~1 minute.

---

## 2. Editing Content & Design

### Where everything lives in `index.html`

| What you want to change | Search for this in the file | Line range (approx.) |
|---|---|---|
| Page title / meta description | `<title>` / `<meta name="description"` | 8–11 |
| Open Graph image / social preview | `og:image` / `twitter:image` | 21, 28 | 
| Color palette (crimson, gold, dark bg) | `/* VARIABLES */` → `:root` / `[data-theme="dark"]` | 83–120 |
| Fonts | `@import` Google Fonts + `font-family:` in CSS | 74, CSS block |
| Countdown target date | `NEXT_DROP` constant in the JS block | ~2350 |
| Hero/About section text | `<section id="about"` | ~1459 |
| Manga section | `<section id="manga"` | ~1573 |
| News section | `<section id="news"` | ~1662 |
| Theories section | `<section id="theories"` | ~1746 |
| Rules section | `<section id="rules"` | ~1833 |
| Info section | `<section id="info"` | ~1883 |
| Staff section | `<section id="staff"` | ~1930 |
| Footer links | `<footer id="ft"` | ~2257 |

### Changing colors
Open `index.html` and find the `[data-theme="dark"]` block (~line 90). The key variables:
```css
--bg:#0A0303;          /* deepest background */
--surface:#1A0808;     /* card backgrounds */
--crimson:#8B1A1A;     /* primary red */
--gold:#C9A84C;        /* accent gold */
--text:#F0DFC0;        /* body text */
```
Edit these hex values and save. The entire site updates automatically.

### Swapping images
All images live in `assets/images/`. Upload replacements with the **exact same filenames**:
- `logo-en.png` — main English logo (header glitch effect)
- `header-bg-dark.jpg` / `header-bg-light.jpg` — hero backgrounds
- `pattern-dark.png` / `pattern-light.png` — repeating texture overlays
- `og-image.jpg` — the 1200×630 image shown when sharing links on social media
- `light-border.png` — decorative border image

### Changing fonts
1. Go to [fonts.google.com](https://fonts.google.com), pick your fonts.
2. Replace the `@import` URL near line 74 in `index.html`.
3. Update `font-family:` values in the CSS variables or targeted selectors.

---

## 3. Deploying Changes via GitHub

### Option A — GitHub Web Editor (easiest, no software needed)
1. Go to `github.com/paradise-district/gokurakugai`
2. Click the file you want to edit (e.g., `index.html`)
3. Click the **pencil icon** (Edit this file) in the top-right
4. Make your changes in the editor
5. Scroll down → "Commit changes" → "Commit directly to `main`"
6. Wait ~60 seconds → visit `https://gokurakugai.wiki` to see changes

### Option B — GitHub Desktop (recommended for bulk file changes)
1. Install [GitHub Desktop](https://desktop.github.com/)
2. Clone `paradise-district/gokurakugai`
3. Edit files locally with VS Code or any text editor
4. In GitHub Desktop: write a commit message → "Commit to main" → "Push origin"

### Option C — Git CLI
```bash
git clone https://github.com/paradise-district/gokurakugai.git
cd gokurakugai
# ... edit files ...
git add .
git commit -m "Update: description of what you changed"
git push origin main
```

### Checking deployment status
Go to your repo → **Settings** → **Pages** → you'll see "Your site is live at..."
with a timestamp of the last deploy. Or check the green ✓ next to your latest commit.

---

## 4. Domain Configuration

### What's already set up
- **CNAME file** in your repo contains `gokurakugai.wiki` ✓
- GitHub Pages is pointed to this CNAME ✓
- Your domain registrar has DNS records pointing to GitHub's servers ✓

### DNS records to verify (at your registrar's DNS panel)
Log in to wherever you bought `gokurakugai.wiki` (Namecheap, Cloudflare, etc.) and
confirm these records exist:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | paradise-district.github.io |

### Enable HTTPS (if not already enabled)
Repo → Settings → Pages → check **"Enforce HTTPS"**. GitHub auto-provisions a free
Let's Encrypt TLS certificate. Takes up to 24h after DNS propagates.

### Updating canonical URLs in `index.html`
Now that you have a custom domain, search for `paradise-district.github.io` in
`index.html` and replace all instances with `https://gokurakugai.wiki`:

Lines to update:
- `<link rel="canonical" href="...">` (line ~14)
- `og:url` meta tag (line ~17)
- `og:image` URL (line ~21)
- `twitter:image` URL (line ~28)
- Structured data `"url"` field (line ~48)
- Structured data `"target"` in SearchAction (line ~52)

---

## 5. Firebase Setup & Integration

Your site is already connected to Firebase project **`gokurakugai-community`**. Here's
how to manage it.

### Access the Firebase Console
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select project **gokurakugai-community**

### What Firebase is used for

| Feature | Firebase Service | Where in code |
|---|---|---|
| Theories (submit/approve) | Firestore → `theories` collection | admin-script.js |
| Gallery images | Firebase Storage → `gallery/` folder | admin-script.js |
| Staff applications | Firestore → `applications` collection | admin-script.js |
| Site settings (countdown date, etc.) | Firestore → `settings` document | admin-script.js |
| Discord OAuth verification | Custom backend (not Firebase) | index.html JS |

### Firestore Collections & Structure

**`theories`** collection:
```
{
  userId: "discord_user_id",
  username: "DiscordUsername#0000",
  avatar: "avatar_url",
  title: "Theory title",
  content: "Theory text body",
  status: "pending" | "approved" | "rejected",
  timestamp: Firestore.Timestamp,
  votes: 0
}
```

**`applications`** collection:
```
{
  userId: "discord_user_id",
  username: "DiscordUsername",
  role: "moderator" | "smm" | "translator",
  answers: { q1: "...", q2: "...", ... },
  status: "pending" | "approved" | "rejected",
  submittedAt: Firestore.Timestamp
}
```

**`settings`** document (`settings/site`):
```
{
  nextChapterDate: Firestore.Timestamp,  ← controls the countdown bar
  chapterNumber: 45,
  maintenanceMode: false
}
```

### Firestore Security Rules
In Firebase Console → Firestore → Rules, set rules so only authenticated staff can
write, but anyone can read approved theories:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read approved theories
    match /theories/{id} {
      allow read: if resource.data.status == 'approved';
      allow write: if request.auth != null;
    }
    // Staff only for applications and settings
    match /applications/{id} {
      allow read, write: if request.auth != null;
    }
    match /settings/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Updating the Firebase config
If you ever need to replace the Firebase config (e.g., recreate the project), find this
block in `admin-script.js` and update:
```js
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyD0wvSd9pj00r8LHMVi-nN889JGzyMEOls',
  authDomain:        'gokurakugai-community.firebaseapp.com',
  projectId:         'gokurakugai-community',
  storageBucket:     'gokurakugai-community.firebasestorage.app',
  messagingSenderId: '856861492305',
  appId:             '1:856861492305:web:1adfe1e8e8f2a4a148e470',
};
```
**Note:** The `apiKey` here is a *browser-safe* identifier, not a secret. It's normal
for it to be public in frontend code — access is controlled by Firestore Security Rules.

---

## 6. Discord OAuth Integration

Your site uses Discord OAuth to let users log in and verify server membership.

### How it works
1. User clicks "Login" → redirected to Discord's OAuth page
2. Discord redirects back to your site with an auth code
3. Your backend/proxy exchanges the code for a user token
4. The site fetches the user's Discord profile + guild membership

### OAuth Application settings (Discord Developer Portal)
Go to [discord.com/developers/applications](https://discord.com/developers/applications):
1. Select your application → **OAuth2** tab
2. Under **Redirects**, add: `https://gokurakugai.wiki`
   (Remove the old `paradise-district.github.io` redirect once custom domain is stable)
3. Copy your **Client ID** — used in the frontend login URL

### Update the OAuth redirect URL in `index.html`
Search for `DISCORD_CLIENT_ID` or the OAuth URL in the JS section and ensure the
`redirect_uri` parameter points to `https://gokurakugai.wiki` (not the GitHub Pages URL).

---

## 7. The Admin Dashboard

The admin panel (`admin-section.html` + `admin-styles.css` + `admin-script.js`) is
already prepared but needs to be properly merged into `index.html`.

### Steps to activate the Admin panel
1. **Merge the HTML**: Copy the entire `<section id="admin" class="sec">` block from
   `admin-section.html` and paste it in `index.html` after the `</section>` closing tag
   of the `#staff` section (around line 2113).

2. **Merge the CSS**: Copy all rules from `admin-styles.css` and paste them at the end
   of the big `<style>` block in `index.html` (before the closing `</style>` tag).

3. **Merge the JS**: Copy the entire content of `admin-script.js` and paste it inside
   the `<script>` block at the bottom of `index.html`, just before `updateGateUI()`.

4. **Add the nav tab**: In the `<ul class="nav-tabs">` in the nav, the admin tab is
   already there but hidden (`display:none`) — it auto-reveals for staff.

5. **Add to VALID_TABS**: In the JS, find `const VALID_TABS=[...]` and add `'admin'`.

### Access control
The admin panel checks Discord OAuth login and verifies the user has "Manage Messages"
permission in the server. If they do, the dashboard reveals. Otherwise it shows
"Staff Access Only." No separate password needed.

---

## 8. Social Redirect Links

The redirect files (included in the ZIP alongside this guide) use instant HTML meta
refresh. Place each folder in the **root of your repository**:

```
gokurakugai/
├─ discord/
│   └─ index.html   → https://discord.gg/gokurakugai
├─ twitter/
│   └─ index.html   → https://twitter.com/gokurakugainews
├─ x/
│   └─ index.html   → https://twitter.com/gokurakugainews  (alias)
├─ instagram/
│   └─ index.html   → https://instagram.com/gokurakugaiwiki
├─ threads/
│   └─ index.html   → https://threads.net/@gokurakugaiwiki
├─ facebook/
│   └─ index.html   → https://facebook.com/gokurakugai
├─ fbgroup/
│   └─ index.html   → https://facebook.com/groups/gokurakugai
└─ bluesky/
    └─ index.html   → https://bsky.app/profile/gokurakugai
```

Resulting clean URLs:
- `gokurakugai.wiki/discord`
- `gokurakugai.wiki/twitter` (also `/x`)
- `gokurakugai.wiki/instagram`
- `gokurakugai.wiki/threads`
- `gokurakugai.wiki/facebook`
- `gokurakugai.wiki/fbgroup`
- `gokurakugai.wiki/bluesky`
- `gokurakugai.wiki/links` (the Linktree-style page)

---

## 9. Adding the Social Links Page

The custom `links.html` file (also included in the ZIP) is a standalone page styled to
match your site's crimson-and-gold aesthetic. To add it:

1. Drop `links.html` into the root of your repository.
2. It's automatically live at `https://gokurakugai.wiki/links`.
3. Link to it from your site footer by adding this line to the footer's first column:
```html
<li><a href="/links">All Social Links</a></li>
```
4. You can also link `gokurakugai.wiki/links` directly in your Discord server description
   or bio, since it works as a standalone Linktree replacement.

---

## 10. SEO & Metadata Updates

### Critical: Update all canonical URLs
Now that you have a custom domain, search `index.html` for `paradise-district.github.io`
and replace every occurrence with `https://gokurakugai.wiki`.

### Open Graph image (`og-image.jpg`)
- Dimensions: **1200 × 630 px**
- Saved as JPEG, under 500KB for fast loading
- Path: `assets/images/og-image.jpg`
- Referenced in lines ~21 and ~28 of `index.html`

### Structured data (JSON-LD)
Update the `"url"` and `"target"` fields in the `<script type="application/ld+json">`
block (around line 44) to use `https://gokurakugai.wiki`.

### Google Search Console
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property: `https://gokurakugai.wiki`
3. Verify ownership via DNS TXT record (add at your registrar)
4. Submit sitemap: `https://gokurakugai.wiki/sitemap.xml`
   (You may need to create a basic `sitemap.xml` — see below)

**Basic sitemap.xml** — create this file in the root of your repo:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://gokurakugai.wiki/</loc><priority>1.0</priority></url>
  <url><loc>https://gokurakugai.wiki/links</loc><priority>0.8</priority></url>
</urlset>
```

---

## 11. Quick-Reference Checklists

### ✅ After purchasing your domain (one-time setup)
- [x] CNAME file in repo contains `gokurakugai.wiki`
- [x] DNS A records point to GitHub's IPs
- [ ] HTTPS enforced in GitHub Pages settings
- [ ] All `paradise-district.github.io` URLs replaced with `https://gokurakugai.wiki`
- [ ] Discord OAuth redirect updated to `https://gokurakugai.wiki`
- [ ] Google Search Console verified
- [ ] Sitemap submitted

### ✅ When updating content
- [ ] Edit the relevant `<section>` in `index.html`
- [ ] Commit and push to `main`
- [ ] Verify changes at `https://gokurakugai.wiki` after ~60 seconds

### ✅ When adding a new staff member
- [ ] Add their card in `<section id="staff">` in `index.html`
- [ ] Make sure their Discord ID has the correct role in your server
  (the admin panel reads roles from Discord, not hardcoded in the HTML)

### ✅ When releasing a new chapter
- [ ] Update `nextChapterDate` in Firestore `settings/site` document
  → The countdown bar will auto-update for all visitors

### ✅ Monthly maintenance
- [ ] Review pending theories in the Admin Dashboard
- [ ] Check Firebase Storage usage (free tier: 1 GB stored, 10 GB/month download)
- [ ] Check Firebase Firestore usage (free tier: 50k reads/day, 20k writes/day)

---

*Last updated: March 2026. Site stack: GitHub Pages + Firebase Firestore/Storage + Discord OAuth.*
