import createApp from "./app";
import 'dotenv/config';


//variaveis 
const app = createApp();

const port = process.env.PORT || 3000


app.listen(port, () => {
    console.log(` server running  at http://localhost:${port}`);
})
