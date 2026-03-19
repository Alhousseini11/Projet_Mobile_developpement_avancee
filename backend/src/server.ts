import { createHttpApp } from './core/http/createHttpApp';
import { env } from './config/env';
import { logger } from './config/logger';

const app = createHttpApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'Garage Mechanic API running');
});
