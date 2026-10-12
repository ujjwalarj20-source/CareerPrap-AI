import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

async function main() {
  await connectDb();
  createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
    console.log(
      env.AI_PROVIDER === 'local'
        ? 'Parsing: local rule-based parser (no external AI, no API key needed)'
        : `Parsing: Anthropic AI (model ${env.AI_MODEL})`,
    );
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
