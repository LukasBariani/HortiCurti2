import  express  from "express";
import  cors  from "cors";



function createApp(){
    const app = express()

    app.use(express.json())

    app.use(cors({
            origin: "*",
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"]
        }));

   

    return app
} 



export default createApp;