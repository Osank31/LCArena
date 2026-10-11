import express, { type Express } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { appErrorHandler } from "@LCArena/middlewares"
import { ALLOWED_ORIGINS } from "./config/env.config"
import { notFoundHandler } from "./middlewares/notFound.middleware"
import { registerRoutes } from "./routes"

export const createApp = (): Express => {
    const app = express()

    app.disable("x-powered-by")

    // `credentials: true` is needed for httpOnly refresh cookies to be accepted
    app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }))

    // Parse incoming cookies (including refreshToken) into req.cookies
    app.use(cookieParser())

    // Mount modular gateway routes
    registerRoutes(app)

    // Fail closed: anything not explicitly registered is rejected with 404
    app.use(notFoundHandler)

    // Centralized error handling
    app.use(appErrorHandler)

    return app
}

export const app = createApp()
