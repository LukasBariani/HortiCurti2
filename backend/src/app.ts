import express  from "express";
import cors  from "cors";
import clientsRouter from "./routes/client_routes"
import shopDayRouter from "./routes/shopDay_routes"

function createApp(){
    const app = express()

    app.use(cors({
            origin: "*",
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"]
    }));

    app.use(express.json())

    //routs
    app.use("/clients", clientsRouter)
    app.use("/shopDay",  shopDayRouter)
    
    return app
} 



export default createApp;