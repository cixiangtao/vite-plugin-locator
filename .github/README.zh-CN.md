# vite-plugin-locator

[English](README.md) | 简体中文

为 Vite 5–8 项目提供一次调用即可完成的 [LocatorJS](https://www.locatorjs.com/) 集成。

插件同时处理源码位置注入与浏览器运行时加载，应用无需直接配置 `@locator/babel-jsx`、`@locator/runtime` 或特定 Vite 版本的 Babel Hook。

## 安装

```bash
pnpm add -D vite-plugin-locator
```

## 使用

把 `locator()` 放在框架插件之前：

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import locator from "vite-plugin-locator";

export default defineConfig({
  plugins: [locator(), react()],
});
```

启动 Vite 开发服务器，按住 Option/Alt 并点击元素，即可在已配置的编辑器中打开源码。集成只在开发环境运行，生产构建不会转换源码或加载 LocatorJS 浏览器运行时。

## 框架支持

默认 `framework: "auto"` 会处理 React、Preact 与 Solid 常见的 JSX/TSX 文件，浏览器运行时会为元素自动选择 JSX、React、Vue 或 Svelte 适配器。多数应用无需指定框架。

自动检测存在歧义时可以显式选择：

```ts
locator({ framework: "vue" });
```

支持 `"auto"`、`"react"`、`"preact"`、`"solid"`、`"vue"` 与 `"svelte"`。Vue 与 Svelte 受当前上游 LocatorJS 能力限制：Vue 位置可能落在组件首行，SSR 组件可能无法检测，Svelte 尚未暴露完整组件名称或边界。

## 选项

```ts
locator({
  framework: "auto",
  include: ["src/**/*.{jsx,tsx}"],
  exclude: ["**/*.generated.tsx"],
  dataAttribute: "id",
  ignoreComponentNames: ["Fragment"],
  runtime: { showIntro: false },
});
```

| 选项                   | 说明                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `enabled`              | 是否启用完整集成，默认 `true`                                                    |
| `framework`            | 自动检测或显式选择框架                                                           |
| `include`              | 选择需要注入源码位置的文件，默认 JSX/TSX                                         |
| `exclude`              | 排除文件                                                                         |
| `dataAttribute`        | LocatorJS JSX 元数据格式：`"id"` 或 `"path"`                                     |
| `ignoreComponentNames` | 跳过匹配组件名的源码元数据                                                       |
| `runtime`              | 设为 `false` 关闭浏览器 UI，或配置 `showIntro`、`projectPath` 和编辑器 `targets` |

## Vite 5–8 兼容性

Vite 8 使用的 `@vitejs/plugin-react` v6 基于 Oxc，自定义 Babel 转换通常需要 `@rolldown/plugin-babel`。本插件不修改框架插件配置，而是使用 Vite 5–8 共用的 `transform` Hook，在 React、Oxc 或其他框架转换之前为匹配文件注入信息，因此集成 API 保持一致。CI 会在各个支持的 Vite 主版本及其兼容 Node.js 运行时上执行测试。

需要合并到已有 Babel 管线时，可使用底层导出：

```ts
import { locatorBabelPlugin, locatorRuntimePlugin } from "vite-plugin-locator";
```

普通 Vite 应用优先使用默认 `locator()`。

## 开发

公开包支持 Node.js 18+，仓库构建与发布工具使用 Node.js 24。

```bash
pnpm install
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
pnpm pack --pack-destination /tmp
```

Release Please 自动维护发版 PR。维护者检查版本、Changelog 与必需 CI 后合并，GitHub Actions 验证准确的合并、只构建打包一次、创建 tag 与 Release，并通过 npm trusted publishing 发布已检查的产物。本地命令不会升版、tag、push 或发布。完整说明见[发布文档](../RELEASING.zh-CN.md)。

安全问题请通过 [GitHub 私密漏洞报告](https://github.com/cixiangtao/vite-plugin-locator/security/advisories/new)提交，普通反馈见[支持说明](../SUPPORT.zh-CN.md)。

## 许可证

[MIT](../LICENSE)
