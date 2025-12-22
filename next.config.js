/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  experimental: {
    serverActions: {
      allowedOrigins: [
        "receevi-zwy7.onrender.com",
        "*.onrender.com"
      ]
    }
  },

  trustHostHeader: true
}

module.exports = nextConfig
