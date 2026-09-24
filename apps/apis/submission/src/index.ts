import express from "express"
import "dotenv/config"
import {connectToQueue, dbConnect} from "@LCArena/config"
import {appErrorHandler, userValidation, roleValidation} from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import { APP_PORT, MONGODB_URL } from "./constants"
import {UserType} from "@LCArena/models"


const app = express()

app.use(express.json())

app.post("/",userValidation, createEvaluation)
app.put("/:submissionId", updateSubmission)

app.use(appErrorHandler);

connectToQueue()
dbConnect(MONGODB_URL)

app.listen(APP_PORT || 3000, async ()=>{
    logger.info(`Server running on port ${APP_PORT || 3000}`)
})