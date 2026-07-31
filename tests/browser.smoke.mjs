import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import react from "@vitejs/plugin-react";
import { chromium } from "playwright";
import { createServer } from "vite";

import locator from "../dist/index.js";

async function createReactFixture() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "vite-plugin-locator-browser-"));
  const root = await realpath(temporaryRoot);

  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await Promise.all([
    writeFile(
      path.join(root, "index.html"),
      '<div id="root"></div><script type="module" src="/src/main.tsx"></script>',
    ),
    writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
      }),
    ),
    writeFile(
      path.join(root, "src/App.tsx"),
      ["export function App() {", '  return <button type="button">Open source</button>;', "}"].join(
        "\n",
      ),
    ),
    writeFile(
      path.join(root, "src/main.tsx"),
      [
        'import { createRoot } from "react-dom/client";',
        'import { App } from "./App";',
        "",
        'createRoot(document.getElementById("root")!).render(<App />);',
      ].join("\n"),
    ),
    symlink(
      path.join(process.cwd(), "node_modules/react"),
      path.join(root, "node_modules/react"),
      "dir",
    ),
    symlink(
      path.join(process.cwd(), "node_modules/react-dom"),
      path.join(root, "node_modules/react-dom"),
      "dir",
    ),
    symlink(process.cwd(), path.join(root, "node_modules/vite-plugin-locator"), "dir"),
  ]);

  return root;
}

void test("initializes LocatorJS and opens the instrumented source from a real browser", async () => {
  const root = await createReactFixture();
  const server = await createServer({
    root,
    logLevel: "silent",
    plugins: [
      locator({
        runtime: {
          showIntro: false,
          targets: {
            smoke: "https://editor.test/open?file=${filePath}&line=${line}&column=${column}",
          },
        },
      }),
      react(),
    ],
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });
  let browser;

  try {
    await server.listen();
    browser = await chromium.launch();

    const address = server.httpServer?.address();
    assert.ok(address && typeof address === "object");

    const context = await browser.newContext();
    const browserErrors = [];

    await context.addInitScript(() => {
      try {
        localStorage.setItem(
          "LOCATOR_OPTIONS",
          JSON.stringify({
            hrefTarget: "_blank",
            showIntro: false,
            templateOrTemplateId: "smoke",
            welcomeScreenDismissed: true,
          }),
        );
      } catch {
        // about:blank does not expose localStorage; the script runs again for the Vite origin.
      }
    });
    await context.route("https://editor.test/**", (route) =>
      route.fulfill({
        body: "editor target",
        contentType: "text/plain",
        status: 200,
      }),
    );

    const page = await context.newPage();
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(message.text());
      }
    });

    await page.goto(`http://127.0.0.1:${address.port}/`);

    const button = page.getByRole("button", { name: "Open source" });
    await button.waitFor();
    await page.waitForFunction(
      () =>
        document
          .querySelector("#locatorjs-wrapper")
          ?.shadowRoot?.querySelector("#locatorjs-layer") !== null,
    );

    const viteErrorOverlay = page.locator("vite-error-overlay");
    if ((await viteErrorOverlay.count()) > 0) {
      const overlayText = await viteErrorOverlay.evaluate(
        (element) => element.shadowRoot?.textContent?.trim() ?? element.textContent?.trim() ?? "",
      );
      assert.fail(`Vite error overlay: ${overlayText}`);
    }

    assert.match((await button.getAttribute("data-locatorjs-id")) ?? "", /src\/App\.tsx/);

    let popup;
    await page.keyboard.down("Alt");
    try {
      await button.hover();
      await page.waitForFunction(() =>
        document.body.classList.contains("locatorjs-active-pointer"),
      );

      const popupPromise = page.waitForEvent("popup");
      await button.click();
      popup = await popupPromise;
    } finally {
      await page.keyboard.up("Alt");
    }

    assert.ok(popup);
    await popup.waitForLoadState();

    const editorUrl = new URL(popup.url());
    assert.equal(editorUrl.origin, "https://editor.test");
    assert.match(editorUrl.searchParams.get("file") ?? "", /src\/App\.tsx$/);
    assert.equal(editorUrl.searchParams.get("line"), "2");
    assert.deepEqual(browserErrors, []);

    await context.close();
  } finally {
    await browser?.close();
    await server.close();
    await rm(root, { force: true, recursive: true });
  }
});
