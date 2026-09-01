import { Router } from "express";
import { sendMail } from "../controllers/mail.controllers.js";

const router = Router()

router.post("/api/v1/", sendMail)

export default router