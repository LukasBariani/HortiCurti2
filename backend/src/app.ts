import express from 'express';
import cors from 'cors';
import clientsRouter from './routes/client_routes';
import shopDayRouter from './routes/shopDay_routes';
import orderRouter from './routes/order_routes';
import rawMessageRouter from './routes/rawMessage_routes';
import dashboardRouter from './routes/dashboard_routes';
import orderItemRouter from './routes/orderItem_routes';

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }),
  );

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  //routs
  app.use('/clients', clientsRouter);
  app.use('/shopDay', shopDayRouter);
  app.use('/order', orderRouter);
  app.use('/parse-message', rawMessageRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/order-items', orderItemRouter);
  return app;
}

export default createApp;
