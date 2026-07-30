import path from "node:path";

import { transformAsync } from "@babel/core";
import locatorBabelModule from "@locator/babel-jsx/dist/index.js";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import type { Plugin, ResolvedConfig } from "vite";

type LocatorBabelTransform = typeof import("@locator/babel-jsx/dist/index.js").default;
type SetupLocatorUI = typeof import("@locator/runtime").default;
type RuntimeSetupOptions = NonNullable<Parameters<SetupLocatorUI>[0]>;
type RuntimeAdapter = RuntimeSetupOptions["adapter"];

const defaultInclude = [/\.[cm]?[jt]sx$/];
const jsxFrameworks = new Set<LocatorFramework>(["auto", "react", "preact", "solid"]);
const runtimeModuleId = "vite-plugin-locator/runtime";
const virtualModuleId = "virtual:vite-plugin-locator";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;
const virtualModuleUrl = `/@id/${virtualModuleId}`;

/**
 * UI framework whose source metadata should be exposed to LocatorJS.
 *
 * `auto` instruments JSX files and lets the browser runtime select its built-in
 * JSX, React, Vue, or Svelte adapter for the element being inspected.
 */
export type LocatorFramework = "auto" | "react" | "preact" | "solid" | "vue" | "svelte";

export interface LocatorBabelOptions {
  /** React-style component names that should not receive LocatorJS metadata. */
  ignoreComponentNames?: string[];
  /** LocatorJS data attribute representation written to JSX elements. */
  dataAttribute?: "id" | "path";
}

export type LocatorBabelPlugin = [
  plugin: LocatorBabelTransform,
  options: LocatorBabelOptions & { env: "development" },
];

export interface LocatorRuntimeOptions {
  /** Override the project path used to build editor links. */
  projectPath?: string;
  /** Show LocatorJS onboarding UI when the runtime starts. */
  showIntro?: boolean;
  /** Custom editor link targets accepted by `@locator/runtime`. */
  targets?: RuntimeSetupOptions["targets"];
}

export interface LocatorOptions extends LocatorBabelOptions {
  /** Enable the integration. @defaultValue true */
  enabled?: boolean;
  /** Files excluded from JSX source instrumentation. */
  exclude?: FilterPattern;
  /** UI framework adapter, or automatic browser-side detection. @defaultValue "auto" */
  framework?: LocatorFramework;
  /** Files included in JSX source instrumentation. @defaultValue JSX and TSX files */
  include?: FilterPattern;
  /** Disable the browser UI or customize its runtime setup. */
  runtime?: false | LocatorRuntimeOptions;
}

function isLocatorBabelTransform(value: unknown): value is LocatorBabelTransform {
  return typeof value === "function";
}

function resolveLocatorBabelTransform(module: unknown): LocatorBabelTransform {
  if (isLocatorBabelTransform(module)) {
    return module;
  }

  // @locator/babel-jsx is CommonJS and some bundlers preserve its `default` wrapper.
  if (
    typeof module === "object" &&
    module !== null &&
    "default" in module &&
    isLocatorBabelTransform(module.default)
  ) {
    return module.default;
  }

  throw new TypeError("Unable to load the LocatorJS Babel plugin");
}

const locatorBabelTransform = resolveLocatorBabelTransform(locatorBabelModule);

function resolveRuntimeAdapter(framework: LocatorFramework): RuntimeAdapter {
  if (framework === "auto") {
    return undefined;
  }

  if (framework === "vue" || framework === "svelte") {
    return framework;
  }

  return "jsx";
}

function withTrailingSeparator(filePath: string) {
  return filePath.endsWith(path.sep) ? filePath : `${filePath}${path.sep}`;
}

function serializeRuntimeOptions(
  framework: LocatorFramework,
  config: ResolvedConfig,
  options: LocatorRuntimeOptions,
) {
  const runtimeOptions: RuntimeSetupOptions = {
    adapter: resolveRuntimeAdapter(framework),
    projectPath: options.projectPath ?? withTrailingSeparator(config.root),
    showIntro: options.showIntro,
    targets: options.targets,
  };

  return JSON.stringify(runtimeOptions);
}

function createSourcePlugin(options: LocatorOptions): Plugin {
  const {
    dataAttribute,
    exclude,
    framework = "auto",
    ignoreComponentNames,
    include = defaultInclude,
  } = options;
  const filter = createFilter(include, exclude);
  let root = process.cwd();

  return {
    name: "vite-plugin-locator:source",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    async transform(code, id) {
      const cleanId = id.split("?", 1)[0];

      if (
        !cleanId ||
        cleanId.includes("/node_modules/") ||
        !jsxFrameworks.has(framework) ||
        !filter(cleanId)
      ) {
        return;
      }

      const result = await transformAsync(code, {
        ast: false,
        babelrc: false,
        configFile: false,
        cwd: root,
        filename: cleanId,
        generatorOpts: {
          retainLines: true,
        },
        parserOpts: {
          plugins: ["jsx", "typescript", "decorators-legacy"],
          sourceType: "unambiguous",
        },
        plugins: [
          [
            locatorBabelTransform,
            {
              dataAttribute,
              ignoreComponentNames,
            } satisfies LocatorBabelOptions,
          ],
        ],
        sourceFileName: cleanId,
        sourceMaps: true,
      });

      if (!result?.code) {
        return;
      }

      return {
        code: result.code,
        map: result.map ?? null,
      };
    },
  };
}

/**
 * Creates the development-only plugin that loads the LocatorJS browser UI.
 */
export function locatorRuntimePlugin(
  framework: LocatorFramework = "auto",
  options: LocatorRuntimeOptions = {},
): Plugin {
  let resolvedConfig: ResolvedConfig | undefined;

  return {
    name: "vite-plugin-locator:runtime",
    apply: "serve",
    configResolved(config) {
      resolvedConfig = config;
    },
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) {
        return;
      }

      if (!resolvedConfig) {
        throw new Error("LocatorJS runtime loaded before Vite configuration was resolved");
      }

      const runtimeOptions = serializeRuntimeOptions(framework, resolvedConfig, options);

      return `
        import setupLocatorUI from "${runtimeModuleId}";

        try {
          setupLocatorUI(${runtimeOptions});
        } catch (error) {
          console.error("[LocatorJS] Failed to initialize", error);
        }
      `;
    },
    transformIndexHtml: {
      order: "pre",
      handler() {
        return [
          {
            tag: "script",
            attrs: {
              type: "module",
              src: virtualModuleUrl,
            },
            injectTo: "head",
          },
        ];
      },
    },
  };
}

/**
 * Creates a one-call LocatorJS integration for Vite development servers.
 *
 * JSX source instrumentation runs before framework transforms. The browser
 * runtime then selects the matching JSX, React, Vue, or Svelte adapter unless
 * `framework` explicitly forces one.
 */
export default function locator(options: LocatorOptions = {}): Plugin[] {
  if (options.enabled === false) {
    return [];
  }

  const framework = options.framework ?? "auto";
  const plugins = [createSourcePlugin(options)];

  if (options.runtime !== false) {
    plugins.push(locatorRuntimePlugin(framework, options.runtime));
  }

  return plugins;
}

/**
 * Returns the upstream Babel plugin tuple for advanced manual integrations.
 *
 * @deprecated Prefer the default `locator()` Vite integration.
 */
export function locatorBabelPlugin(options: LocatorBabelOptions = {}): LocatorBabelPlugin {
  return [locatorBabelTransform, { ...options, env: "development" }];
}

/** Alias for the default one-call integration. */
export const locatorPlugin = locator;
