import nodemailer from "nodemailer"
import { MAIL_PASSWORD, MAIL_USER } from "../constants/constants.js"
import { InternalServerError, logger } from "@LCArena/utils"

export const createTransporter = () => {
    const user = MAIL_USER
    const pass = MAIL_PASSWORD

    logger.error({user, pass})

    if (!user || !pass) {
        throw new InternalServerError("Mail user or pass not found")
    }

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user,
            pass
        }
    })
}