/**
 * Carbon Compass — Render server entry point.
 *
 * Reads PORT from environment (Render injects it automatically).
 * Falls back to 10000 for local development.
 */

import app from './app.js';

const PORT = parseInt(process.env.PORT ?? '10000', 10);

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      event: 'server_start',
      service: 'carbon-compass-ai',
      port: PORT,
    }),
  );
});
