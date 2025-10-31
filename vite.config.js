import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    // Set base path for production builds served from /applicants
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
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log(`Proxying ${req.method} request to: ${req.url}`);
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log(`Received ${proxyRes.statusCode} response for: ${req.url}`);
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