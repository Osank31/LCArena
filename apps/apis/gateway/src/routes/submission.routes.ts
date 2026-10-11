import { Router } from "express"
import { servicesConfig } from "../config/services.config"
import { authenticate } from "../middlewares/authenticate.middleware"
import { requireSubmissionOwner } from "../middlewares/submissionOwner.middleware"
import { createServiceProxy } from "../proxy/proxy.factory"

const router = Router()
const submissionProxy = createServiceProxy(servicesConfig.submission)

// Any authenticated user can submit; gateway supplies verified identity
submissionRouter: router.post("/", authenticate, submissionProxy)

// Reading or updating a submission requires ownership or Admin
router.get(
    "/:id",
    authenticate,
    requireSubmissionOwner,
    submissionProxy
)
router.put(
    "/:id",
    authenticate,
    requireSubmissionOwner,
    submissionProxy
)

export const submissionRoutes = router
