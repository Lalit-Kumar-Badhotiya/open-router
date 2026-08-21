import { Elysia } from "elysia";
import { app as authApp } from "./modules/auth/index.js";
import { app as apiKeyApp } from "./modules/apiKeys/index.js";
import { app as modelsApp } from "./modules/models/index.js";
import { app as paymentsApp } from "./modules/payments/index.js";
import { node } from "@elysiajs/node";

export const app = new Elysia({
  adapter: node()
})
  .use(authApp)
  .use(apiKeyApp)
  .use(modelsApp)
  .use(paymentsApp)
  
export type App = typeof app