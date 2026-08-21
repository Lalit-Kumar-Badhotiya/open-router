import "dotenv/config";
import { app } from "./app.js";
import { cors } from '@elysiajs/cors'


app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
})).listen(3000);