import { createTransporter } from "../config/mail.config.js";

export interface IMailData {
    email: string;
    subject: string;
    body: string;
    from: string;
}

export const sendMail = async (data: IMailData) => {
    const transporter = createTransporter()
    

    return transporter.sendMail({
        from: data.from,
        to: data.email,
        subject: data.subject,
        html: data.body
    })

}