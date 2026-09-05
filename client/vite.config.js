import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isHtmlRequest = (req) => {
  return req.headers.accept && req.headers.accept.includes('text/html');
};

const proxyRule = {
  target: 'http://localhost:3000',
  changeOrigin: true,
  bypass: (req) => {
    // If the browser is requesting an HTML document page, bypass proxy so Vite serves index.html
    if (isHtmlRequest(req)) {
      return '/index.html';
    }
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': proxyRule,
      '/classes': proxyRule,
      '/sessions': proxyRule,
      '/bookings': proxyRule,
      '/members': proxyRule,
      '/membership-alerts': proxyRule,
      '/instructor': proxyRule,
      '/dashboard': proxyRule,
    },
  },
});
