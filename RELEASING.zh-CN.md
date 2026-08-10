# 发布 vite-plugin-locator

[English](RELEASING.md) | 简体中文

GitHub Actions 是 npm 与 GitHub Release 的唯一发布者，Release Please 自动维护发版 PR。

普通改动通过受保护的 `main`、PR 与必需检查合入。Release Please 根据 Conventional Commit 或 squash merge 标题维护唯一发版 PR、SemVer 版本与 `CHANGELOG.md`。维护者检查受限差异、版本、Changelog 和 CI 后合并；`.github/workflows/release.yml` 重新验证准确的合并，只构建和打包一次，创建 `vX.Y.Z`，通过 npm trusted publishing 发布已检查产物，并创建匹配的 GitHub Release。

发布后核对工作流、tag、Release、npm 版本与 dist-tags，并运行 `pnpm release:verify <version>`。不要在本地升版、创建 tag 或发布；普通 PR 合并不会发布。

仓库通过 `RELEASE_APP_CLIENT_ID` 与 `RELEASE_APP_PRIVATE_KEY` 使用已安装且具有 Contents、Issues、Pull requests 读写权限的 GitHub App。部分失败时，先检查发版 PR、工作流、tag、Release 与 npm，再重试同一工作流；不得改用本地 `npm publish` 或手工 tag。
