import express from "express"
import "dotenv/config"
import { APP_PORT, MONGODB_URL } from "./constants/constants.js"
import { appErrorHandler } from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import { dbConnect } from "@LCArena/config"
import problemRouter from "./routers/problem.router.js"

const app = express()

app.use(express.json())

app.get("/health", (req, res)=>{
    res.status(200).json({message: "Problem Service Healthy"})
})

app.use("/", problemRouter)

app.use(appErrorHandler);

dbConnect(MONGODB_URL)


app.listen(APP_PORT || 3000, ()=>{
    logger.info(`Server running on port ${APP_PORT || 3000}`)
})