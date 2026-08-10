# Releasing vite-plugin-locator

English | [简体中文](RELEASING.zh-CN.md)

GitHub Actions is the only npm and GitHub Release publisher. Release Please automatically maintains
the release pull request.

## Normal flow

1. Merge ordinary changes into protected `main` through pull requests and required checks. Other
   open pull requests may remain open.
2. Release Please updates one automated release PR from a
   `release-please--branches--main--...` branch. Conventional commit or squash-merge titles
   determine the proposed SemVer version and `CHANGELOG.md` (`fix` = patch, `feat` = minor, and
   `!` or `BREAKING CHANGE` = major).
3. Review the release-only diff, version, changelog, and required CI, then merge the release PR.
4. `.github/workflows/release.yml` revalidates that exact merge, builds and packs once, creates
   `vX.Y.Z`, publishes the inspected artifact through npm trusted publishing, and creates the
   matching GitHub Release.
5. Verify the workflow, tag target, GitHub Release flags, npm version/dist-tags, and run
   `pnpm release:verify <version>`.

Do not bump versions, create tags, or publish from a workstation. A regular PR merge never
publishes.

## Automation credentials and recovery

Define the Actions variable `RELEASE_APP_CLIENT_ID` and secret `RELEASE_APP_PRIVATE_KEY` for a
GitHub App installed on this repository with Contents, Issues, and Pull requests read/write
permissions. Its token lets required CI run unattended; PR checks created with the default
`GITHUB_TOKEN` currently wait for separate workflow approval.

For partial failures, inspect the merged release PR, workflow, tag, GitHub Release, and npm version
before retrying the same workflow. Never recover with local `npm publish` or a manual release tag.
