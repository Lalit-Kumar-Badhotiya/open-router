import { app } from "./app";
import { cors } from '@elysiajs/cors'


// Dashboard origin allowed for cross-origin cookie requests.
// Set FRONTEND_URL in .env (e.g. "http://localhost:3001" for local dev);
// falls back to the deployed dashboard so behavior is unchanged otherwise.
const frontendUrl = process.env.FRONTEND_URL ?? "https://open-router-edv9.onrender.com";

app.use(cors({
    origin: frontendUrl,
    credentials: true,
})).listen(3000);
