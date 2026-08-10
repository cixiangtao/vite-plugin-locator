# 参与贡献

[English](CONTRIBUTING.md) | 简体中文

使用 Node.js 24 与 `package.json` 声明的 pnpm。保持改动聚焦，为行为或兼容性变化补充测试，并保留 Vite 5–8 支持。

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
pnpm check:package
```

使用 Conventional Commits，并在 PR 中说明受影响框架或 Vite 版本、用户可见行为与验证结果。不要提交凭据、构建产物、包压缩文件或本地配置。版本、tag、npm 发布与 Release 由维护者负责，见[发布说明](RELEASING.zh-CN.md)。漏洞按[安全政策](SECURITY.zh-CN.md)私密报告。
