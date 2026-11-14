import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {sendReport} from './presentation.mjs';
try{
 const token=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_CHAT_ID,url=process.env.DASHBOARD_URL||'https://kns7676-commits.github.io/time-etf-dashboard/all-holdings/';
 if(!token||!chat||!url)throw Error('텔레그램 설정과 DASHBOARD_URL이 필요합니다.');
 const pending=JSON.parse(await readFile('output/pending.json','utf8'));
 await sendReport(token,chat,url);
 if(!pending.saved){await writeFile('state/cumulative.json.tmp',JSON.stringify(pending.history));await rename('state/cumulative.json.tmp','state/cumulative.json');}
 if(!pending.saved){await mkdir('state',{recursive:true});await writeFile('state/latest.json.tmp',JSON.stringify(pending.baseline));await rename('state/latest.json.tmp','state/latest.json');}
}catch(e){console.error(e.message);process.exitCode=1;}
