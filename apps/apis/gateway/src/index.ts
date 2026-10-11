import "dotenv/config"
import { dbConnect, redisConnect } from "@LCArena/config"
import { logger } from "@LCArena/utils"
import { app } from "./app"
import { APP_PORT, MONGODB_URL } from "./config/env.config"

async function startServer(): Promise<void> {
    try {
        await dbConnect(MONGODB_URL)
        await redisConnect()

        app.listen(APP_PORT, () => {
            logger.info(`Gateway listening on port ${APP_PORT}`)
        })
    } catch (error) {
        logger.error(error)
        process.exit(1)
    }
}

startServer()
