// Run from the project root. The optional renderer is isolated in .cache/visual-tools.
const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  Resvg,
} = require("../.cache/visual-tools/node_modules/@resvg/resvg-js");
const root = process.cwd();
const bundle = path.join(root, ".cache/scenery-sheet.cjs");
buildSync({
  entryPoints: ["scripts/scenery-sheet.tsx"],
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  outfile: bundle,
  external: ["react", "react-dom/server", "react/jsx-runtime"],
  alias: { "react-native-svg": path.join(root, "scripts/svg-primitives.tsx") },
});
const { Sheet } = require(bundle);
const svg = renderToStaticMarkup(Sheet());
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  "docs/scenery-preview.png",
  new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: ["assets/fonts/Inter_400Regular.ttf"],
    },
  })
    .render()
    .asPng(),
);
console.log("Rendered docs/scenery-preview.png from the artwork components.");
