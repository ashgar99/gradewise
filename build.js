// Builds the Gradewise bookmark, the panel script it loads, and the page.
// Run with: node build.js
//
// The bookmark itself is a short loader. When clicked on Moodle it loads
// docs/gradewise-panel.js from the Gradewise site, so it stays well within
// browsers' limits on bookmark length and always runs the latest version.
// If the terser package is installed (npm install terser), the panel is minified.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const SITE = 'https://ashgar99.github.io/gradewise/';
const source = fs.readFileSync(path.join(root, 'gradewise-import.js'), 'utf8');

const loader = `(()=>{if(document.getElementById('gradewise-root'))return;` +
  `const s=document.createElement('script');s.src='${SITE}gradewise-panel.js?t='+Date.now();` +
  `s.onerror=()=>alert('Gradewise could not load. Check your internet connection and try again.');` +
  `document.body.appendChild(s);})();`;

async function main() {
  let panel = source;
  try {
    const { minify } = require(process.env.TERSER_PATH || 'terser');
    panel = '// Gradewise for Moodle. Source: https://github.com/ashgar99/gradewise/blob/main/gradewise-import.js\n' +
      (await minify(source, { compress: true, mangle: true, format: { comments: false } })).code;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
  }
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'gradewise-panel.js'), panel + '\n');
  const bookmarklet = 'javascript:' + encodeURIComponent(loader);
  fs.writeFileSync(path.join(root, 'bookmarklet.txt'), bookmarklet + '\n');
  const template = fs.readFileSync(path.join(root, 'site', 'index.template.html'), 'utf8');
  fs.writeFileSync(path.join(root, 'docs', 'index.html'), template.split('{{BOOKMARKLET}}').join(bookmarklet));
  console.log(`Built bookmarklet.txt (${bookmarklet.length} characters), docs/gradewise-panel.js and docs/index.html`);
}
main();
