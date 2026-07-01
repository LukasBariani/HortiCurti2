import createApp from './app';
import 'dotenv/config';
import { initZap } from './services/whatsapp_service';

//variaveis
const app = createApp();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(` server running at http://localhost:${port}`);
  initZap();
});
