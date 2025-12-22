// Simple start script that serves the static `dist` folder
// Uses the `serve` package programmatically and respects process.env.PORT

const serve = require('serve');

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const host = '0.0.0.0';

console.log(`Starting static server at http://${host}:${port} serving ./dist`);

serve('dist', {
  port,
  host,
  single: true,
});
