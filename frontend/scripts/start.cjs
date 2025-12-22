// Simple start script that serves the static `dist` folder using CommonJS and `serve-handler`
const http = require('http');
const handler = require('serve-handler');

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const host = '0.0.0.0';

console.log(`Starting static server at http://${host}:${port} serving ./dist`);

const server = http.createServer((req, res) => {
  return handler(req, res, { public: 'dist' });
});

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
