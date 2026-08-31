import { Router } from "express";
import { createEvaluation, updateSubmission } from "../controller/submission.controller.js";
import { userValidation } from "../middleware/user.validation.js";

const router = Router()

router.post("/",userValidation, createEvaluation)
router.put("/:submissionId", updateSubmission)

export default router