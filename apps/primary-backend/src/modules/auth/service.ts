import { prisma } from "db";
import { jwt } from '@elysiajs/jwt'

export abstract class AuthService {
    static async signup(email: string, password: string): Promise<string> {
        const user = await prisma.user.create({
            data: {
                email,
                password: await Bun.password.hash(password)
            }
        })
        return user.id.toString()
    }
    static async signin(email: string, password: string): Promise<{correctCredentials: boolean, userId?: string}> {
        const user = await prisma.user.findFirst({
            where: {
                email
            }
        })

        // Users created/linked via Google have no password set
        if (!user || !user.password) {
            return { correctCredentials: false };
        }

        if (!await Bun.password.verify(password, user.password)) {
            return { correctCredentials: false };
        }

        return { correctCredentials: true, userId: user.id.toString() };
    } 

    static async getUserDetails(id: number) {
        return prisma.user.findFirst({
            where: {
                id
            },
            select: {
                credits: true
            }
        })
    }

    /**
     * Exchange the authorization code Google redirected back with for the
     * user's Google profile. Returns null on any failure (bad code, network,
     * missing env config).
     */
    static async exchangeGoogleCode(code: string): Promise<GoogleProfile | null> {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
                grant_type: "authorization_code"
            })
        })

        if (!tokenResponse.ok) {
            console.error("Google token exchange failed", await tokenResponse.text())
            return null
        }

        const token = (await tokenResponse.json()) as { access_token?: string }
        if (!token.access_token) {
            return null
        }

        const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: {
                Authorization: `Bearer ${token.access_token}`
            }
        })

        if (!profileResponse.ok) {
            console.error("Google userinfo request failed", await profileResponse.text())
            return null
        }

        const profile = (await profileResponse.json()) as {
            sub?: string
            email?: string
            email_verified?: boolean
        }

        if (!profile.sub || !profile.email) {
            return null
        }

        return {
            googleId: profile.sub,
            email: profile.email,
            emailVerified: profile.email_verified ?? false
        }
    }

    /**
     * Find an existing user for that Google account (by googleId or by email,
     * linking the Google account to the email/password account), or create a
     * new one. Returns null when the Google account's email is not verified.
     */
    static async findOrCreateGoogleUser(profile: GoogleProfile): Promise<{ userId: string } | null> {
        if (!profile.emailVerified) {
            return null
        }

        const linkedUser = await prisma.user.findUnique({
            where: {
                googleId: profile.googleId
            }
        })

        if (linkedUser) {
            return { userId: linkedUser.id.toString() }
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email: profile.email
            }
        })

        // Same email already registered with email/password → link the Google account
        if (existingUser) {
            const updatedUser = await prisma.user.update({
                where: {
                    id: existingUser.id
                },
                data: {
                    googleId: profile.googleId
                }
            })

            return { userId: updatedUser.id.toString() }
        }

        const createdUser = await prisma.user.create({
            data: {
                email: profile.email,
                googleId: profile.googleId
            }
        })

        return { userId: createdUser.id.toString() }
    }
    
}

type GoogleProfile = {
    googleId: string
    email: string
    emailVerified: boolean
}
