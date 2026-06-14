import logger from "../logger.js"
import nodemailer from "nodemailer"
import 'dotenv/config';

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
})

export async function sendEmail({
    to,
    subject,
    message,
    name,
    applicantEmail,
    file
}) {

    try {
        return transporter.sendMail({
            from: process.env.GMAIL_USER,
            to,
            subject,
            replyTo: applicantEmail,

            html: `
            <p>${message}</p>

            <hr>

            <p>
                <strong>Nome:</strong> ${name}
            </p>

            <p>
                <strong>Email:</strong> ${applicantEmail}
            </p>
        `,

            attachments: file
                ? [
                    {
                        filename: file.originalname,
                        content: file.buffer
                    }
                ]
                : []
        })
    } catch (error) {
        logger.error("Failed to send email", error)
        throw new Error("Failed to send email")
    }
}