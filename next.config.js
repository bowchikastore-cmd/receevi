/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  experimental: {
    serverActions: {
      allowedOrigins: [
        "https://receevi-zwy7.onrender.com"
      ]
    }
  }
}

module.exports = nextConfig
