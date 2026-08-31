import express from "express"
import "dotenv/config"
import { APP_PORT, MONGODB_URL } from "./constants/constants.js"
import { appErrorHandler } from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import { dbConnect } from "@LCArena/config"
import cookieParser from "cookie-parser"
import userRouter from "./router/user.router.js"
import { redisConnect } from "@LCArena/config"

const app = express()

app.use(express.json())
app.use(cookieParser())


app.use("/", userRouter)


app.use(appErrorHandler);

dbConnect(MONGODB_URL)
redisConnect()


app.listen(APP_PORT || 3000, ()=>{
    logger.info(`Server running on port ${APP_PORT || 3000}`)
})