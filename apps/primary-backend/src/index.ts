import { app } from "./app";
import { cors } from '@elysiajs/cors'


app.use(cors({
    origin: 'https://trouble-primary-be.onrender.com',
    credentials: true,
})).listen(3000);
