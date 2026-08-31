import express from "express"
import "dotenv/config"
import { APP_PORT, MONGODB_URL } from "./constants/constants.js"
import { appErrorHandler } from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import { dbConnect } from "@LCArena/config"
import submissionRouter from "./router/submission.router.js"
import {connectToQueue} from "@LCArena/config"

const app = express()

app.use(express.json())

app.use("/", submissionRouter)


app.use(appErrorHandler);

connectToQueue()
dbConnect(MONGODB_URL)

app.listen(APP_PORT || 3000, async ()=>{
    logger.info(`Server running on port ${APP_PORT || 3000}`)
})