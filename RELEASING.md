# Releasing vite-plugin-locator

GitHub Actions is the only npm publisher. release-it prepares a constrained
release pull request and stops before tagging, pushing, or publishing.

## Contract

- `package.json` owns the SemVer version.
- Ordinary changes enter protected `main` through required pull requests and
  checks. Other open pull requests may remain open.
- A release branch must be exactly `release/vX.Y.Z`; its PR may change only
  `package.json` and `pnpm-lock.yaml`.
- `.github/workflows/release.yml` accepts only the merge commit associated with
  that exact PR, builds and packs without write credentials, then creates the
  tag and publishes through npm trusted publishing.
- npm and the remote Git tag are the canonical release surfaces. This project
  does not create GitHub Releases.

## Prepare

1. Synchronize `main` with `origin/main` and merge every ordinary PR intended
   for the version.
2. Create `release/vX.Y.Z` from that exact `main` head.
3. Run `pnpm release:check` and preview with `pnpm release:dry <increment>`.
4. Run `pnpm release <increment>` and inspect the release-only diff.
5. Push the branch and open a PR into `main`.

## Publish and recover

Merge the checked release PR. Verify the workflow, tag target, npm version and
dist-tags, then run `pnpm release:verify <version>`.

For partial failures, inspect the existing tag and npm version before retrying
the same merged-PR workflow. Never recover with local `npm publish` or a manual
release tag.
