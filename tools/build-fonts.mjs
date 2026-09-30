// Downloads self-hosted fonts (SIL OFL) so the game works offline on GitHub Pages.
// The Japanese heading font is subset to only the characters used in the game's source,
// so re-run this after adding new Japanese UI text:  node tools/build-fonts.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const sources = ["index.html", ...readdirSync(join(root, "js")).map(f => join("js", f))];
const chars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!?.,:;+-×/()「」『』・…！？、。〜ー％%★→");
for (const file of sources) for (const ch of readFileSync(join(root, file), "utf8")) if (ch.codePointAt(0) > 0x2000) chars.add(ch);

async function fetchCss(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}
async function save(url, out) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(join(root, out), Buffer.from(await res.arrayBuffer()));
  console.log("saved", out);
}

for (const weight of [600, 700]) {
  const css = await fetchCss(`https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@${weight}`);
  const latin = css.split("/* latin */")[1];
  await save(latin.match(/url\((.+?)\)/)[1], `assets/fonts/chakra-petch-${weight}.woff2`);
}
const text = encodeURIComponent([...chars].join(""));
const css = await fetchCss(`https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@800&text=${text}`);
await save(css.match(/url\((.+?)\)/)[1], "assets/fonts/mplus1-800-subset.woff2");
console.log(`subset glyphs: ${chars.size}`);
