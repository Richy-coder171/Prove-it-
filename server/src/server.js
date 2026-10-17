import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

try {
  await connectDb();
  const server = app.listen(env.PORT, () => {
    process.stdout.write(
      `ProveIt API listening on http://localhost:${env.PORT}\n`,
    );
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
} catch (error) {
  process.stderr.write(`Could not start ProveIt API: ${error.message}\n`);
  process.exitCode = 1;
}
