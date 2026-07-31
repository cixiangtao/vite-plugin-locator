import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import react from "@vitejs/plugin-react";
import { build, createServer } from "vite";

import locator from "../dist/index.js";

async function createReactFixture() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "vite-plugin-locator-"));
  const root = await realpath(temporaryRoot);

  await Promise.all([
    writeFile(
      path.join(root, "index.html"),
      '<div id="root"></div><script type="module" src="/src/App.tsx"></script>',
    ),
    writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
      }),
    ),
  ]);

  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await symlink(
    path.join(process.cwd(), "node_modules/react"),
    path.join(root, "node_modules/react"),
    "dir",
  );
  await writeFile(
    path.join(root, "src/App.tsx"),
    ["export function App() {", '  return <button type="button">Open</button>;', "}"].join("\n"),
  );

  return root;
}

void test("runs before the React transform in a real Vite dev server", async () => {
  const root = await createReactFixture();
  const server = await createServer({
    root,
    logLevel: "silent",
    plugins: [locator(), react()],
    optimizeDeps: {
      noDiscovery: true,
    },
    server: {
      hmr: false,
      middlewareMode: true,
    },
  });

  try {
    const transformed = await server.transformRequest("/src/App.tsx");
    const html = await server.transformIndexHtml(
      "/",
      await readFile(path.join(root, "index.html"), "utf8"),
    );

    assert.ok(transformed);
    assert.match(transformed.code, /data-locatorjs-id/);
    assert.match(transformed.code, /__LOCATOR_DATA__/);
    assert.match(html, /virtual:vite-plugin-locator/);
  } finally {
    await server.close();
  }
});

void test("leaves a real Vite production build free of LocatorJS code", async () => {
  const root = await createReactFixture();
  const result = await build({
    root,
    logLevel: "silent",
    plugins: [locator(), react()],
    build: {
      write: false,
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const generatedCode = outputs
    .flatMap((output) => output.output)
    .map((item) => ("code" in item ? item.code : ""))
    .join("\n");

  assert.doesNotMatch(generatedCode, /data-locatorjs|__LOCATOR_DATA__|LocatorJS/);
});
