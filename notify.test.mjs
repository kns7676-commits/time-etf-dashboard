import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendDashboardLink} from './notify.mjs';

test('sends exactly the dashboard URL without a preview', async () => {
  let calls=0;
  await sendDashboardLink({token:'test',chatId:'123',url:'https://example.com/all-holdings/',fetcher:async (url, options) => {
    calls++;
    assert.equal(url,'https://api.telegram.org/bottest/sendMessage');
    assert.deepEqual(JSON.parse(options.body),{chat_id:'123',text:'https://example.com/all-holdings/',link_preview_options:{is_disabled:true}});
    return {ok:true,json:async()=>({ok:true})};
  }});
  assert.equal(calls,1);
});
test('rejects missing credentials and Telegram API failures', async () => {
  await assert.rejects(sendDashboardLink({url:'https://example.com'}),/required/);
  await assert.rejects(sendDashboardLink({token:'test',chatId:'123',url:'https://example.com',fetcher:async()=>({ok:true,json:async()=>({ok:false})})}),/failed/);
});
