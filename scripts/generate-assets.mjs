import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = "com.bigchiefrick.kickclipper.sdPlugin";

const iconSvg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="18" fill="#0b0d0e"/>
  <rect x="8" y="8" width="128" height="128" rx="14" fill="#151819" stroke="#53fc18" stroke-width="4"/>
  <path d="M44 38l20 19-20 19M100 38L80 57l20 19" fill="none" stroke="#53fc18" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="72" y="106" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="22" font-weight="800">CLIP</text>
  <text x="72" y="126" text-anchor="middle" fill="#53fc18" font-family="Arial, sans-serif" font-size="13" font-weight="700">30 SEC</text>
</svg>`);

const monoSvg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
  <path d="M7 7l11 13L7 33M33 7L22 20l11 13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

async function writePng(relativePath, size, svg) {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await sharp(svg(size)).resize(size, size).png().toFile(target);
}

await Promise.all([
  writePng("imgs/actions/clip/key.png", 144, iconSvg),
  writePng("imgs/actions/clip/key@2x.png", 288, iconSvg),
  writePng("imgs/actions/clip/icon.png", 20, monoSvg),
  writePng("imgs/actions/clip/icon@2x.png", 40, monoSvg),
  writePng("imgs/plugin/category-icon.png", 20, monoSvg),
  writePng("imgs/plugin/category-icon@2x.png", 40, monoSvg),
  writePng("imgs/plugin/marketplace.png", 288, iconSvg),
  writePng("imgs/plugin/marketplace@2x.png", 576, iconSvg)
]);
