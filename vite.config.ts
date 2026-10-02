import { defineConfig, lazyPlugins } from "vite-plus";
import { VitePWA } from "vite-pwa-plugin";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    sortImports: true,
    sortPackageJson: { sortScripts: true },
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: { typeAware: true, typeCheck: true },
  },
  base: "/infinite-minesweeper/",
  plugins: lazyPlugins(() => [
    VitePWA({
      manifest: {
        name: "Infinite Minesweeper",
        short_name: "Minesweeper",
        description: "A modern, infinitely playable game of Minesweeper with no ads.",
        display: "standalone",
        orientation: "any",
        theme_color: "2e2e2e",
      },
    }),
  ]),
});
