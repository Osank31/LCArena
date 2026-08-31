import { Router } from "express";
import { createProblem, deleteProblem, getAllProblems, getSingleProblem, updateProblem } from "../controllers/problem.controller.js";

const router = Router()

router.post("/", createProblem)
router.get("/", getAllProblems)
// router.get("/search", searchProblems)
router.get("/:id", getSingleProblem)
router.put("/:id", updateProblem)
router.delete("/:id", deleteProblem)

export default router;