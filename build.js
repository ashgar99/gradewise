// Builds bookmarklet.txt and the page (docs/index.html) from gradewise-import.js.
// Run with: node build.js
// If the terser package is installed (npm install terser), the bookmark is minified,
// which keeps it well within browsers' limits on bookmark length.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const source = fs.readFileSync(path.join(root, 'gradewise-import.js'), 'utf8');

// Fallback: drop comment-only lines and indentation
const compact = source
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('//'))
  .join('\n');

async function main() {
  let code = compact;
  try {
    const { minify } = require(process.env.TERSER_PATH || 'terser');
    code = (await minify(source, { compress: true, mangle: true, format: { comments: false } })).code;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
  }
  const bookmarklet = 'javascript:' + encodeURIComponent(code);
  fs.writeFileSync(path.join(root, 'bookmarklet.txt'), bookmarklet + '\n');
  const template = fs.readFileSync(path.join(root, 'site', 'index.template.html'), 'utf8');
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'index.html'), template.split('{{BOOKMARKLET}}').join(bookmarklet));
  console.log(`Built bookmarklet.txt (${bookmarklet.length} characters) and docs/index.html`);
}
main();
