# Contributing

English | [简体中文](CONTRIBUTING.zh-CN.md)

Use Node.js 24 and the pnpm version declared in `package.json`. Keep changes focused, add tests for behavior or compatibility changes, and preserve support for Vite 5–8.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
pnpm check:package
```

Use Conventional Commits and explain the affected frameworks or Vite versions, user-visible behavior, and verification in the pull request. Do not commit credentials, build output, package archives, or local configuration. Maintainers own versions, tags, npm publication, and Releases; see [Releasing](RELEASING.md).

Report vulnerabilities through [Security](SECURITY.md), not a public issue.
