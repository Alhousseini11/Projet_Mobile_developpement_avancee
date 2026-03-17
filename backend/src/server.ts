import { createHttpApp } from './core/http/createHttpApp';
import { env } from './config/env';

const app = createHttpApp();

app.listen(env.PORT, () => {
  console.log(`Garage Mechanic API running on port ${env.PORT}`);
});
