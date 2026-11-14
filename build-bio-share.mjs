import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {applyBioDesign} from './all-holdings/bio-design.mjs';
let html=await readFile('output/site/all-holdings/bio/index.html','utf8');
html=html.replace(/<section id="sox-card"[\s\S]*?<\/section>\s*<script>[\s\S]*?<\/script>/,'').replace(/<nav class="theme-tabs"[\s\S]*?<\/nav>/,'');
html=applyBioDesign(html);
if(html.includes('id="sox-card"')||html.includes('<nav class="theme-tabs"')||html.includes('kns7676'))throw Error('Sharing page contains excluded content');
await mkdir('output/netlify-bio',{recursive:true});
await writeFile('output/netlify-bio/index.html',html);
console.log('Standalone Netlify bio page rebuilt with system fonts; no SOX or AI navigation');
