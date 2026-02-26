import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Custom Vite plugin to auto-save submissions to the Desktop
const saveBallotPlugin = () => {
  return {
    name: 'save-ballot-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/save-ballot', (req: any, res: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: string) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const submission = JSON.parse(body);
              const desktopPath = path.join(os.homedir(), 'Desktop', 'ordinal_topology_submissions.json');

              let existingData = [];
              if (fs.existsSync(desktopPath)) {
                try {
                  existingData = JSON.parse(fs.readFileSync(desktopPath, 'utf-8'));
                  if (!Array.isArray(existingData)) existingData = [];
                } catch (e) {
                  existingData = [];
                }
              }

              existingData.push({
                timestamp: new Date().toISOString(),
                ...submission
              });

              fs.writeFileSync(desktopPath, JSON.stringify(existingData, null, 2), 'utf-8');

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Saved to Desktop' }));
            } catch (err) {
              console.error('Failed to save ballot:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: 'Failed to save' }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    saveBallotPlugin(),
  ],
})
