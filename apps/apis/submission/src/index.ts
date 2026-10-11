import express from "express"
import "dotenv/config"
import {connectToQueue, dbConnect} from "@LCArena/config"
import {appErrorHandler, userValidation} from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import { APP_PORT, MONGODB_URL } from "./constants"
import {createEvaluation, updateSubmission, getSubmission} from "./controller"


const app = express()

app.use(express.json())

app.post("/",
    userValidation,
    createEvaluation)
app.put("/:submissionId", updateSubmission)
app.get("/:submissionId", getSubmission)

app.use(appErrorHandler);

async function startServer() {
    try {
        await connectToQueue()
        await dbConnect(MONGODB_URL)

        app.listen(APP_PORT || 3000, ()=>{
            logger.info(`Server running on port ${APP_PORT || 3000}`)
        })
    } catch (error) {
        logger.error(error)
    }
}

startServer()