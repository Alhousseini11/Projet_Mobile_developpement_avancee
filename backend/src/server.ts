import { env, validateRuntimeEnv } from './config/env';
import { logger } from './config/logger';

async function startServer() {
  let disconnectPrisma: (() => Promise<void>) | null = null;

  try {
    validateRuntimeEnv();

    const [{ createHttpApp }, prismaClientModule, { assertDatabaseIsReady }] = await Promise.all([
      import('./core/http/createHttpApp'),
      import('./data/prisma/client'),
      import('./data/prisma/databaseReadiness')
    ]);

    disconnectPrisma = prismaClientModule.disconnectPrisma;

    await assertDatabaseIsReady();

    const app = createHttpApp();
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'Garage Mechanic API running');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Backend startup checks failed; backend will not start');
    if (disconnectPrisma) {
      await disconnectPrisma();
    }
    process.exit(1);
  }
}

void startServer();
