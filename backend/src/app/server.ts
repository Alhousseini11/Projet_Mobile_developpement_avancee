import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { env } from '../config/env';

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

registerRoutes(app);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Garage Mechanic API running on port ${env.PORT}`);
});
