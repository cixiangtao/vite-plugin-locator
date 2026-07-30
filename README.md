# vite-plugin-locator

面向 Vite 项目的 LocatorJS 一键开发态集成。一个插件同时完成源码位置标记与
浏览器 runtime 注入，业务项目无需了解不同 Vite 版本的 Babel 接入差异，也无需
直接配置 `@locator/babel-jsx` 或 `@locator/runtime`。

## 使用

将 `locator()` 放在框架插件之前：

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import locator from "vite-plugin-locator";

export default defineConfig({
  plugins: [locator(), react()],
});
```

开发服务器启动后，按住 Option/Alt 移动到页面元素并点击，即可在所选编辑器中
打开对应源码。生产构建不会执行源码转换，也不会加载 LocatorJS runtime。

## 框架

默认 `framework: "auto"`：

```ts
locator();
```

插件会在 React、Preact 和 Solid 常用的 JSX/TSX 文件中加入 LocatorJS 标记；
浏览器 runtime 会自动选择其内置的 JSX、React、Vue 或 Svelte 适配器。因此普通
项目以及包含多种渲染方式的项目通常不需要声明框架。

遇到识别歧义时，可以显式指定：

```ts
locator({ framework: "vue" });
```

支持值：

- `"auto"`：默认值，自动识别。
- `"react"`、`"preact"`、`"solid"`：使用统一的 JSX 源码标记协议。
- `"vue"`：使用 LocatorJS 的 Vue 3 runtime 适配器。
- `"svelte"`：使用 LocatorJS 的 Svelte runtime 适配器。

Vue 和 Svelte 继承 LocatorJS 上游当前的实验性限制：Vue 通常只能定位到组件文件
首行，SSR 组件可能无法识别；Svelte 暂不提供完整的组件名与组件边界信息。

## 选项

```ts
locator({
  framework: "auto",
  include: ["src/**/*.{jsx,tsx}"],
  exclude: ["**/*.generated.tsx"],
  dataAttribute: "id",
  ignoreComponentNames: ["Fragment"],
  runtime: {
    showIntro: false,
  },
});
```

- `enabled`：关闭完整集成，默认 `true`。
- `framework`：自动识别或强制选择 UI 框架。
- `include` / `exclude`：JSX 源码标记的文件过滤规则。
- `dataAttribute`：LocatorJS JSX 数据格式，可选 `"id"` 或 `"path"`。
- `ignoreComponentNames`：不加入定位信息的 JSX 组件名。
- `runtime`：设为 `false` 时仅保留源码标记；也可传入 `showIntro`、
  `projectPath` 和自定义编辑器 `targets`。

## 为什么兼容 Vite 5–8

`@vitejs/plugin-react` v5 及以下通过自身的 `babel` 选项接受插件，v6 在 Vite 8
中改用 Oxc，并要求自定义 Babel 转换通过 `@rolldown/plugin-babel` 接入。

本插件不修改框架插件配置。它使用各版本 Vite 共有的 `transform` 生命周期，在
React、Oxc 或其他框架转换之前完成 LocatorJS 标记，因此调用方式不随 Vite 版本
变化。

## 高级手动集成

极少数需要把 LocatorJS 合并进现有 Babel 链的项目仍可使用：

```ts
import { locatorBabelPlugin, locatorRuntimePlugin } from "vite-plugin-locator";
```

普通 Vite 项目应优先使用默认的 `locator()`。

## 开发

```bash
pnpm install
pnpm check
pnpm build
pnpm pack --pack-destination /tmp
```
