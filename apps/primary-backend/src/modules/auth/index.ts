import { Cookie, Elysia } from "elysia";
import { AuthModel } from "./models";
import { AuthService } from "./service";
import jwt from "@elysiajs/jwt";

// Where the browser lives — used to send users back after the OAuth callback.
// Falls back to the currently deployed dashboard so behavior is unchanged
// when the env var is not set.
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://open-router-edv9.onrender.com";

export const app = new Elysia({ prefix: "auth" })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET!
        })
    )
    .post("/sign-up", async ({ body, status }) => {
        try {
            const userId = await AuthService.signup(body.email, body.password);
            return {
                id: userId
            }
        } catch(e) {
            console.log(e)
            return status(400, {
                message: "Error while signing up"
            })
        }
    }, {
        body: AuthModel.signupSchema,
        response: {
            200: AuthModel.signupResponseSchema,
            400: AuthModel.signupFailedResponseSchema,
        }
    })
    .post("/sign-in", async ({ jwt, body, status, cookie: { auth } }) => {
        const { correctCredentials, userId } = await AuthService.signin(body.email, body.password)
        if (correctCredentials && userId) {
            const token = await jwt.sign({ userId })
            if (!auth) {
                auth = new Cookie("auth", {});
            }

            auth.set({
                value: token,
                httpOnly: true,
                maxAge: 7 * 86400,
                sameSite: "none",
                secure: true,
            })

            return {
                message: "Signed in successfully"
            }
        } else {
            return status(403, {
                message: "Incorrect credentials"
            })
        }
    }, {
        body: AuthModel.signinSchema,
        response: {
            200: AuthModel.signinResponseSchema,
            403: AuthModel.signinFailureSchema
        }
    })
    .get("/google", async ({ cookie: { g_state }, status, redirect }) => {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
            return status(503, {
                message: "Google OAuth is not configured on this server"
            })
        }

        // CSRF protection: the value is stored in a short-lived cookie and must
        // come back unchanged in the callback's ?state= parameter
        const state = crypto.randomUUID()

        // Secure cookies are only storable over https, so derive the flag from
        // whether the redirect URI itself is https (https for prod, http localhost for dev)
        const secureCookie = process.env.GOOGLE_REDIRECT_URI.startsWith("https")

        if (!g_state) {
            g_state = new Cookie("g_state", {});
        }

        g_state.set({
            value: state,
            httpOnly: true,
            maxAge: 600,
            secure: secureCookie,
            sameSite: "lax",
            path: "/auth/google"
        })

        const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
        authorizationUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID)
        authorizationUrl.searchParams.set("redirect_uri", process.env.GOOGLE_REDIRECT_URI)
        authorizationUrl.searchParams.set("response_type", "code")
        authorizationUrl.searchParams.set("scope", "openid email profile")
        authorizationUrl.searchParams.set("state", state)
        // Always show the account chooser so users can pick / switch accounts
        authorizationUrl.searchParams.set("prompt", "select_account")

        return redirect(authorizationUrl.toString())
    })
    .get("/google/callback", async ({ jwt, query, cookie: { auth, g_state }, redirect }) => {
        const redirectToSigninWithError = (error: string) => redirect(`${FRONTEND_URL}/signin?error=${error}`)

        // User denied the consent screen or Google reported an error
        if (typeof query.error === "string") {
            return redirectToSigninWithError("oauth")
        }

        if (typeof query.code !== "string" || typeof query.state !== "string") {
            return redirectToSigninWithError("oauth")
        }

        if (!g_state || !g_state.value || g_state.value !== query.state) {
            return redirectToSigninWithError("oauth")
        }

        const googleProfile = await AuthService.exchangeGoogleCode(query.code)
        if (!googleProfile) {
            return redirectToSigninWithError("oauth")
        }

        const result = await AuthService.findOrCreateGoogleUser(googleProfile)
        if (!result) {
            return redirectToSigninWithError("email-unverified")
        }

        // Same session cookie the email/password sign-in sets
        const token = await jwt.sign({ userId: result.userId })

        if (!auth) {
            auth = new Cookie("auth", {});
        }

        auth.set({
            value: token,
            httpOnly: true,
            maxAge: 7 * 86400,
            sameSite: "none",
            secure: true,
        })

        return redirect(`${FRONTEND_URL}/dashboard`)
    })
    .resolve(async ({ cookie: { auth }, status, jwt}) => {
        if (!auth) {
            return status(401)
        }

        const decoded = await jwt.verify(auth.value as string);

        if (!decoded || !decoded.userId) {
            return status(401)
        }

        return {
            userId: decoded.userId as string
        }
    })
    .get("/profile", async({ userId, status }) => {
        const userData = await AuthService.getUserDetails(Number(userId));
        if (!userData) {
            return status(400, {
                message: "Error while fetching user details"
            })
        }
        return userData
    }, {
        response: {
            200: AuthModel.profileResponseSchema,
            400: AuthModel.profileResponseErrorSchema
        }
    })