import 'dotenv/config';
import createApp from './app';
import { initZap } from './services/whatsapp_service';

//variaveis
const app = createApp();

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

app.listen(Number(port), host, () => {
  console.log(` server running at http://${host}:${port}`);
  initZap();
});
