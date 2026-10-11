import express from "express"
import "dotenv/config"
import { appErrorHandler } from "@LCArena/middlewares"
import {dbConnect} from "@LCArena/config"
import { logger } from "@LCArena/utils"
import { APP_PORT, MONGODB_URL } from "./constants"
import {createProblem, getAllProblems, getSingleProblem, updateProblem, deleteProblem} from "./controller"


const app = express()

app.use(express.json())

app.get("/health", (_, res)=>{
    res.status(200).json({message: "Problem Service Healthy"})
})

app.post("/", createProblem)
app.get("/", getAllProblems)
app.get("/:id", getSingleProblem)
app.put("/:id", updateProblem)
app.delete("/:id", deleteProblem)

app.use(appErrorHandler);

async function startServer() {
    try {
        await dbConnect(MONGODB_URL)

        app.listen(APP_PORT || 3000, ()=>{
            logger.info(`Server running on port ${APP_PORT || 3000}`)
        })
    } catch (error) {
        logger.error(error)
    }
}

startServer()