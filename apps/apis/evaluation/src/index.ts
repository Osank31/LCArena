import express from "express"
import "dotenv/config"
import { APP_PORT } from "./constants"
import { appErrorHandler } from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import {connectToQueue} from "@LCArena/config"
import { startWorker } from "./evaluationWorker"

const app = express()

app.use(express.json())




app.use(appErrorHandler);


async function startServer() {
    try {
        await connectToQueue()
        await startWorker()
        
        app.listen(APP_PORT || 3000, ()=>{
            logger.info(`Server running on port ${APP_PORT || 3000}`)
        })
        
    } catch (error) {
        logger.error(error)
    }
}

startServer()