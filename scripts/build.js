import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.js';
const dist = path.join(ROOT, 'dist');
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
for (const f of ['index.html', 'styles.css', 'app.js']) fs.copyFileSync(path.join(ROOT, f), path.join(dist, f));
fs.cpSync(path.join(ROOT, 'data'), path.join(dist, 'data'), { recursive: true });
console.log('Built static site in dist/.');
