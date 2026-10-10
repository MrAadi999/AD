const { processChatMessage } = require('./lib/chat/chat-service');

async function test() {
  try {
    const res = await processChatMessage({
      workspaceId: 'ws-demo-01',
      chatbotId: 'bot-demo-01',
      userMessage: 'tum kaun ho?'
    });
    console.log('Bot Response:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
