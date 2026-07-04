import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

export default defineConfig({
    plugins: [react()],
    // Set base path for production builds served from /zp-staff
    base: process.env.NODE_ENV === 'production' ? '/zp-staff/' : '/',
    server: {
        port: 5173,
        host: true,
        proxy: {
            // Proxy all /auth requests to your API server
            '/auth': {
                target: 'https://api.gramsamruddhi.in',
                changeOrigin: true,
                secure: true,
                credentials: 'include',
                configure: (proxy) => {
                    proxy.on('proxyReq', (_proxyReq, req) => {
                        console.log(`Proxying ${req.method} request to: ${req.url}`);
                    });
                    proxy.on('proxyRes', (_proxyRes, req) => {
                        console.log(`Received ${_proxyRes.statusCode} response for: ${req.url}`);
                    });
                }
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        assetsDir: 'assets'
    }
})
