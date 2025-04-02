import { NextResponse } from 'next/server';
import { Bot, InlineKeyboard, BotError } from 'grammy';

export const dynamic = "force-static";

// Get the bot token from environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Check if the token is available
if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
}

// Create a bot instance
const bot = new Bot(BOT_TOKEN);

await bot.init();

// Handle the /start command
bot.command('start', async (ctx) => {
  try {
    // Create an inline keyboard with a button to open the Mini App
    const keyboard = new InlineKeyboard()
      .webApp(
        'Play Game', // Button text
        process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://your-deployed-app-url.com' // Mini App URL
      );

    // Send a welcome message with the keyboard
    await ctx.reply(
      'Welcome to the Game Bot! 🎮\n\nClick the button below to start playing!',
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error('Error in /start command:', error);
  }
});

// Handle the /help command
bot.command('help', async (ctx) => {
  try {
    await ctx.reply(
      'How to play:\n\n' +
      '1. Click the "Play Game" button to open the game\n' +
      '2. Follow the instructions in the game\n' +
      '3. Have fun!\n\n' +
      'Available commands:\n' +
      '/start - Start the bot and get the game button\n' +
      '/help - Show this help message'
    );
  } catch (error) {
    console.error('Error in /help command:', error);
  }
});

// Handle text messages
bot.on('message:text', async (ctx) => {
  try {
    // Respond to any text message with a prompt to use commands
    await ctx.reply(
      'Use /start to get the game button or /help for instructions.'
    );
  } catch (error) {
    console.error('Error in message handler:', error);
  }
});

// Error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

// This is the webhook handler for Next.js API routes
export async function POST(request: Request) {
  try {
    // Get the update from the request body
    const update = await request.json();
    
    console.log('Received update:', JSON.stringify(update));
    
    // Process the update with Grammy
    await bot.handleUpdate(update);
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ 
      error: 'Failed to process webhook', 
      message: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

// Add a GET handler for webhook verification (optional but useful)
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint is working' });
}
