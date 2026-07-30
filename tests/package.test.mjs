import assert from "node:assert/strict";
import test from "node:test";

import locator, { locatorBabelPlugin, locatorPlugin, locatorRuntimePlugin } from "../dist/index.js";

const projectRoot = "/workspace/locator-app";
const sourceFile = `${projectRoot}/src/App.tsx`;

function resolvePlugin(plugin) {
  plugin.configResolved?.({
    root: projectRoot,
  });

  return plugin;
}

void test("creates one-call source and runtime plugins", () => {
  const plugins = locator();

  assert.equal(plugins.length, 2);
  assert.equal(plugins[0].name, "vite-plugin-locator:source");
  assert.equal(plugins[0].apply, "serve");
  assert.equal(plugins[0].enforce, "pre");
  assert.equal(plugins[1].name, "vite-plugin-locator:runtime");
  assert.equal(plugins[1].apply, "serve");
  assert.deepEqual(
    locatorPlugin().map((plugin) => plugin.name),
    plugins.map((plugin) => plugin.name),
  );
});

void test("instruments JSX before the framework transform", async () => {
  const [sourcePlugin] = locator({ runtime: false });
  resolvePlugin(sourcePlugin);

  const result = await sourcePlugin.transform?.(
    "export function App() { return <button>Open</button>; }",
    sourceFile,
  );

  assert.match(result.code, /data-locatorjs-id=/);
  assert.match(result.code, /window\.__LOCATOR_DATA__/);
  assert.match(result.code, /src\/App\.tsx/);
  assert.ok(result.map);
});

void test("respects JSX source filters", async () => {
  const [sourcePlugin] = locator({
    exclude: "**/*.generated.tsx",
    runtime: false,
  });
  resolvePlugin(sourcePlugin);

  const excludedResult = await sourcePlugin.transform?.(
    "export const Generated = () => <div />;",
    `${projectRoot}/src/View.generated.tsx`,
  );
  const nonJsxResult = await sourcePlugin.transform?.(
    "export const value = 1;",
    `${projectRoot}/src/value.ts`,
  );

  assert.equal(excludedResult, undefined);
  assert.equal(nonJsxResult, undefined);
});

void test("auto mode leaves runtime adapter selection to LocatorJS", () => {
  const runtimePlugin = resolvePlugin(locatorRuntimePlugin());
  const runtimeSource = runtimePlugin.load?.("\0virtual:vite-plugin-locator");

  assert.match(runtimeSource, /vite-plugin-locator\/runtime/);
  assert.match(runtimeSource, /"projectPath":"\/workspace\/locator-app\/"/);
  assert.doesNotMatch(runtimeSource, /"adapter":/);
});

for (const [framework, adapter] of [
  ["react", "jsx"],
  ["preact", "jsx"],
  ["solid", "jsx"],
  ["vue", "vue"],
  ["svelte", "svelte"],
]) {
  void test(`maps ${framework} to the ${adapter} runtime adapter`, () => {
    const runtimePlugin = resolvePlugin(locatorRuntimePlugin(framework));
    const runtimeSource = runtimePlugin.load?.("\0virtual:vite-plugin-locator");

    assert.match(runtimeSource, new RegExp(`"adapter":"${adapter}"`));
  });
}

void test("does not run the JSX transform for explicit Vue projects", async () => {
  const [sourcePlugin] = locator({
    framework: "vue",
    runtime: false,
  });
  resolvePlugin(sourcePlugin);

  const result = await sourcePlugin.transform?.(
    "export function Render() { return <button>Open</button>; }",
    sourceFile,
  );

  assert.equal(result, undefined);
});

void test("can disable the runtime or the complete integration", () => {
  assert.equal(locator({ runtime: false }).length, 1);
  assert.deepEqual(locator({ enabled: false }), []);
});

void test("injects the runtime through a development HTML module", () => {
  const runtimePlugin = locatorRuntimePlugin();

  assert.equal(
    runtimePlugin.resolveId?.("virtual:vite-plugin-locator"),
    "\0virtual:vite-plugin-locator",
  );
  assert.deepEqual(runtimePlugin.transformIndexHtml.handler(), [
    {
      tag: "script",
      attrs: {
        type: "module",
        src: "/@id/virtual:vite-plugin-locator",
      },
      injectTo: "head",
    },
  ]);
});

void test("keeps the manual Babel integration as an advanced API", () => {
  const [plugin, options] = locatorBabelPlugin({
    dataAttribute: "path",
    ignoreComponentNames: ["Fragment"],
  });

  assert.equal(typeof plugin, "function");
  assert.deepEqual(options, {
    dataAttribute: "path",
    ignoreComponentNames: ["Fragment"],
    env: "development",
  });
});
