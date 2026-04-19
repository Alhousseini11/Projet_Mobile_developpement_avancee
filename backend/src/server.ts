import { createHttpApp } from './core/http/createHttpApp';
import { env } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma } from './data/prisma/client';
import { assertDatabaseIsReady } from './data/prisma/databaseReadiness';

async function startServer() {
  try {
    await assertDatabaseIsReady();

    const app = createHttpApp();
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'Garage Mechanic API running');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Database compatibility preflight failed; backend will not start');
    await disconnectPrisma();
    process.exit(1);
  }
}

void startServer();
