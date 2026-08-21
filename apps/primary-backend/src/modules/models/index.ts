import Elysia from "elysia";
import { ModelsModel } from "./models.js";
import { ModelsService } from "./service.js";

export const app = new Elysia({ prefix: "models" })
    .get("/", async () => {
        const models = await ModelsService.getModels();
        return {
            models
        }
    }, {
        response: {
            200: ModelsModel.getModelsResponseSchema
        }
    })
    .get("/providers", async () => {
        const providers = await ModelsService.getProviders();
        return {
            providers
        }
    }, {
        response: {
            200: ModelsModel.getProvidersResponseSchema
        }
    })
    .get("/:id/providers", async ({ params: { id } }) => {
        const providers = await ModelsService.getModelProviders(Number(id));
        return {
            providers
        }
    }, {
        response: {
            200: ModelsModel.getModelProvidersResponseSchema
        }
    })
