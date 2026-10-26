import app from "./app";
import { logger } from "./lib/logger";
import { tickActiveMatches } from "./lib/match";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Persisted match state is recovered independently of browser polling. The database row lock in
// tickActiveMatches keeps this watchdog idempotent with concurrent player requests.
setInterval(() => {
  void tickActiveMatches().catch((err) => logger.error({ err }, "Multiplayer recovery tick failed"));
}, 2_000);
