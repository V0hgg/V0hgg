# Profile Stats Setup

This repository hosts two things:
- Profile README at `/README.md`
- Self-hosted `github-readme-stats` at `/services/github-readme-stats`

## Vercel Project

- Project: `hunters-projects-83122528/github-readme-stats`
- Root directory: `services/github-readme-stats`
- Stable production domain: `https://github-readme-stats-opal-pi-60.vercel.app`

## Required Secret (Private-Inclusive Metrics)

Set `PAT_1` in Vercel for `Preview` and `Production`.

- Token type: GitHub Classic PAT
- Scopes: `repo`, `read:user`

Example CLI commands:

```bash
cd /Users/hunter/v0hgg/V0hgg/services/github-readme-stats
vercel env add PAT_1 preview
vercel env add PAT_1 production
```

## Redeploy

After adding or changing env vars:

```bash
cd /Users/hunter/v0hgg/V0hgg/services/github-readme-stats
vercel deploy -y
vercel --prod
```

## Upstream Sync

Pull upstream changes into the vendored subtree:

```bash
cd /Users/hunter/v0hgg/V0hgg
git subtree pull --prefix services/github-readme-stats https://github.com/anuraghazra/github-readme-stats.git master --squash
```
