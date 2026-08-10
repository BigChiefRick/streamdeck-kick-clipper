import { exec } from "node:child_process";
import path from "node:path";
import url from "node:url";
import { defineConfig } from "rolldown";

const isWatching = !!process.env.ROLLUP_WATCH;
const pluginUuid = "com.bigchiefrick.kickclipper";
const pluginFolder = `${pluginUuid}.sdPlugin`;

export default defineConfig({
  input: "src/plugin.ts",
  output: {
    file: `${pluginFolder}/bin/plugin.js`,
    sourcemap: isWatching,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) =>
      url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href,
    minify: !isWatching
  },
  transform: { decorator: { legacy: true } },
  platform: "node",
  resolve: { conditionNames: ["node"] },
  plugins: [
    {
      name: "watch-externals",
      buildStart() {
        this.addWatchFile(`${pluginFolder}/manifest.json`);
        this.addWatchFile(`${pluginFolder}/ui/settings.html`);
      },
      buildEnd() {
        if (!isWatching) return;
        exec(
          `npx --yes --package @elgato/cli@1.7.4 streamdeck restart ${pluginUuid}`,
          { windowsHide: true },
          (error, stdout, stderr) => {
            if (stdout) console.log(stdout.trim());
            if (stderr) console.error(stderr.trim());
            if (error) console.error("Failed to restart Stream Deck:", error.message);
          }
        );
      }
    },
    {
      name: "emit-module-package-file",
      generateBundle() {
        this.emitFile({ fileName: "package.json", source: '{ "type": "module" }', type: "asset" });
      }
    }
  ]
});
