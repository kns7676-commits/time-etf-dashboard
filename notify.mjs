import {pathToFileURL} from 'node:url';

export async function sendDashboardLink({token, chatId, url, fetcher=fetch}) {
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Dashboard URL must use HTTPS');
  const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:'POST', headers:{'content-type':'application/json'}, signal:AbortSignal.timeout(30000),
    body:JSON.stringify({chat_id:chatId, text:parsed.href, link_preview_options:{is_disabled:true}})
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error('Telegram link delivery failed');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  sendDashboardLink({token:process.env.TELEGRAM_BOT_TOKEN, chatId:process.env.TELEGRAM_CHAT_ID,
    url:process.env.DASHBOARD_URL || 'https://kns7676-commits.github.io/time-etf-dashboard/all-holdings/'})
    .catch(error => {console.error(error.message); process.exitCode=1;});
}
