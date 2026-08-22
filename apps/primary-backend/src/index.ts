import { app } from "./app";
import { cors } from '@elysiajs/cors'


app.use(cors({
    origin: 'https://open-router-edv9.onrender.com',
    credentials: true,
})).listen(3000);
