import { Router } from "express"
import { authRoutes } from "./auth.routes"
import { healthRoutes } from "./health.routes"
import { problemRoutes } from "./problem.routes"
import { submissionRoutes } from "./submission.routes"

const apiRouter = Router()

apiRouter.use("/", healthRoutes)
apiRouter.use("/auth", authRoutes)
apiRouter.use("/api/problems", problemRoutes)
apiRouter.use("/api/submissions", submissionRoutes)

export const registerRoutes = (app: Router): void => {
    app.use(apiRouter)
}

export { apiRouter }
export * from "./auth.routes"
export * from "./health.routes"
export * from "./problem.routes"
export * from "./submission.routes"
