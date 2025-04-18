#!/bin/bash

# Start ngrok in the background for port 3000
echo "Starting ngrok..."
ngrok http 3000 > /dev/null &

# Wait a few seconds for ngrok to initialize and create the tunnel
echo "Waiting for ngrok tunnel..."
sleep 5

# Fetch the public URL from the ngrok API
echo "Fetching ngrok public URL..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto=="https") | .public_url')

if [ -z "$NGROK_URL" ]; then
  echo "Error: Could not fetch ngrok URL. Is ngrok running?"
  exit 1
fi

echo "Ngrok URL obtained: $NGROK_URL"

# Update the .env file with the new BASE_URL
# Note: This uses sed. Be careful if your .env structure changes significantly.
# It looks for the line starting with 'BASE_URL=' and replaces the value.
echo "Updating .env file..."
# Use a temporary file for sed compatibility on macOS
sed -i.bak "s|^BASE_URL=.*|BASE_URL=$NGROK_URL|" .env
rm .env.bak # Remove the backup file created by sed -i on macOS

echo ".env file updated."

# Run the set-webhook script
echo "Running set-webhook script..."
node scripts/set-webhook.js

echo "Setup complete. BASE_URL set to $NGROK_URL and webhook updated."
echo "Your application should now be accessible via $NGROK_URL"
echo "Keep this terminal open to keep ngrok running."

# Optional: Bring ngrok to the foreground if you want to see its logs
# fg %1
