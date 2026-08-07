# vite-plugin-locator

One-call [LocatorJS](https://www.locatorjs.com/) integration for Vite 5–8 projects.

The plugin handles both source-location instrumentation and browser runtime injection. Applications
do not need to configure `@locator/babel-jsx`, `@locator/runtime`, or version-specific Babel hooks
directly.

## Installation

```bash
pnpm add -D vite-plugin-locator
```

You can also install it with npm, Yarn, or Bun.

## Usage

Add `locator()` before your framework plugin:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import locator from "vite-plugin-locator";

export default defineConfig({
  plugins: [locator(), react()],
});
```

Start the Vite development server, hold Option/Alt, and click an element to open its source in your
configured editor.

The integration only runs during development. Production builds do not transform source files or
load the LocatorJS browser runtime.

## Framework support

The default is `framework: "auto"`:

```ts
locator();
```

In auto mode, the plugin instruments common JSX and TSX files used by React, Preact, and Solid.
The browser runtime automatically selects a compatible JSX, React, Vue, or Svelte adapter for the
inspected element. Most applications, including applications with multiple rendering approaches,
do not need to specify a framework.

You can select a framework explicitly when automatic detection is ambiguous:

```ts
locator({ framework: "vue" });
```

Supported values:

- `"auto"` — instruments JSX/TSX and lets LocatorJS choose the runtime adapter.
- `"react"`, `"preact"`, and `"solid"` — use the shared JSX source metadata format.
- `"vue"` — uses the LocatorJS Vue 3 runtime adapter.
- `"svelte"` — uses the LocatorJS Svelte runtime adapter.

Vue and Svelte follow the current upstream LocatorJS limitations. Vue locations may resolve to the
first line of a component, SSR components may not be detected, and Svelte does not yet expose full
component names or boundaries.

## Options

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

| Option                 | Description                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `enabled`              | Enables the complete integration. Defaults to `true`.                                                           |
| `framework`            | Automatically detects or explicitly selects the UI framework.                                                   |
| `include`              | Selects files for JSX source instrumentation. Defaults to JSX and TSX files.                                    |
| `exclude`              | Excludes files from JSX source instrumentation.                                                                 |
| `dataAttribute`        | Selects LocatorJS JSX metadata format: `"id"` or `"path"`.                                                      |
| `ignoreComponentNames` | Skips source metadata for matching JSX component names.                                                         |
| `runtime`              | Set to `false` to disable the browser UI, or configure `showIntro`, `projectPath`, and custom editor `targets`. |

## Vite 5–8 compatibility

`@vitejs/plugin-react` v5 and earlier accept Babel plugins through their `babel` option. In Vite 8,
v6 uses Oxc and requires custom Babel transforms to be connected through
`@rolldown/plugin-babel`.

`vite-plugin-locator` does not modify framework plugin configuration. It uses the Vite `transform`
hook shared by Vite 5–8 and instruments matching source files before React, Oxc, or another
framework transform runs. The integration API therefore remains the same across supported Vite
versions. CI exercises the latest release in each supported Vite major against its compatible Node
runtime.

## Advanced manual integration

Projects that need to merge LocatorJS into an existing Babel pipeline can use the lower-level
exports:

```ts
import { locatorBabelPlugin, locatorRuntimePlugin } from "vite-plugin-locator";
```

Most Vite applications should use the default `locator()` integration.

## Development

The published package supports Node 18 and newer. Repository build and release tooling uses Node 24.

```bash
pnpm install
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
pnpm pack --pack-destination /tmp
```

## Releasing

Release Please automatically maintains the release pull request from changes merged into `main`.
Run the local release gate when validating a candidate:

```bash
pnpm release:check
```

Conventional commit or squash-merge titles determine the proposed version and Changelog. Review
the automated release PR and its required checks, then merge it when ready. GitHub Actions verifies
that exact merge, builds and packs once, creates the tag and GitHub Release, and publishes the
inspected package artifact through npm trusted publishing. Local commands never bump versions,
tag, push, or publish.

See [RELEASING.md](../RELEASING.md) for the complete gate and recovery contract.

After publishing, verify that npm and the remote Git tag resolve to the same commit:

```bash
pnpm release:verify
```

## Security

Report suspected vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/cixiangtao/vite-plugin-locator/security/advisories/new),
not a public issue. See the [security policy](../SECURITY.md) for details.

## License

[MIT](../LICENSE)
