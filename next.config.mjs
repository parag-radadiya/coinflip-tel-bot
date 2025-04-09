/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // output: 'export',
  env: {
    BOT_TOKEN: process.env.BOT_TOKEN,
    API_BASE_URL: process.env.API_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  }
}

// Validate required environment variables
const requiredEnvs = ['BOT_TOKEN', 'API_BASE_URL'];
for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Environment variable ${env} is required but not set.`);
  }
}

export default nextConfig;
