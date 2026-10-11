import { Router } from "express"
import { roleValidation } from "@LCArena/middlewares"
import { UserType } from "@LCArena/models"
import { servicesConfig } from "../config/services.config"
import { authenticate } from "../middlewares/authenticate.middleware"
import { createServiceProxy } from "../proxy/proxy.factory"

const router = Router()
const problemProxy = createServiceProxy(servicesConfig.problem)

// Browsing problems is public: works before signing in
router.get("/", problemProxy)
router.get("/:id", problemProxy)

// Mutating problems requires Admin role
router.post(
    "/",
    authenticate,
    roleValidation(UserType.Admin),
    problemProxy
)
router.put(
    "/:id",
    authenticate,
    roleValidation(UserType.Admin),
    problemProxy
)
router.delete(
    "/:id",
    authenticate,
    roleValidation(UserType.Admin),
    problemProxy
)

export const problemRoutes = router
