import express from "express"
import "dotenv/config"
import { APP_PORT } from "./constants/constants.js"
import { appErrorHandler } from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import mailRouter from "./routes/mail.route.js"

const app = express()

app.use(express.json())

app.use(mailRouter)


app.use(appErrorHandler);



app.listen(APP_PORT || 3000, ()=>{
    logger.info(`Server running on port ${APP_PORT || 3000}`)
})