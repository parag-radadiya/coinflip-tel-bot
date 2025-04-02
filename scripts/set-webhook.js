import 'dotenv/config';
import { log } from 'node:console';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBAPP_URL 
  ? `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/webhook` 
  : null;

if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('Error: NEXT_PUBLIC_WEBAPP_URL not found in .env file');
  process.exit(1);
}

async function setWebhook() {
  try {
    console.log(`Setting webhook to: ${WEBHOOK_URL}`);
    log( `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}`);
    
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}`
    );
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Webhook set successfully!');
    } else {
      console.error('❌ Failed to set webhook:', data.description);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message);
    process.exit(1);
  }
}

setWebhook();
