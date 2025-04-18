# Coinflip Telegram Bot

A simple Telegram bot that simulates coin flips, allowing users to play and track their results.

## Features

- Flip a virtual coin (Heads or Tails)
- Track user statistics
- View personal flip history
- Simple and intuitive commands

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Telegram Bot Token (obtainable from [BotFather](https://t.me/botfather))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/coinflip-tel-bot.git
   cd coinflip-tel-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Telegram bot token:
   ```
   BOT_TOKEN=your_telegram_bot_token_here
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## Usage

Once the bot is running, you can interact with it on Telegram using the following commands:

- `/start` - Initialize the bot
- `/flip` - Flip a coin
- `/stats` - View your statistics
- `/history` - View your flip history
- `/help` - Display available commands

## Project Structure

```
coinflip-tel-bot/
├── src/
│   ├── bot.js        # Main bot logic
│   ├── commands/     # Command handlers
│   ├── database/     # Database operations
│   └── utils/        # Utility functions
├── .env              # Environment variables
├── package.json      # Project dependencies
└── README.md         # Project documentation
```

## Technologies Used

- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Telegraf](https://github.com/telegraf/telegraf) - Telegram Bot Framework
- [MongoDB](https://www.mongodb.com/) (or your database of choice) - For data storage

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Telegram Bot API](https://core.telegram.org/bots/api)
- All contributors who have helped with the project
