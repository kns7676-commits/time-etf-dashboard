import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
function tests(dir, recursive=false) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(e => {
    const path=join(dir,e.name);
    return e.isDirectory() ? (recursive ? tests(path,true) : []) : (e.name.endsWith('.test.mjs') ? [path] : []);
  });
}
const files=[...tests('.'),...tests('all-holdings',true),...tests('reports',true)];
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(result.error) console.error(result.error.message);
process.exitCode=result.status??1;
