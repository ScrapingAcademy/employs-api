import { applySchema } from "../validators/apply.validator.js"
import { sendEmail } from "../services/email.service.js"
import logger from "../logger.js"

export async function applyJob(req, res) {
    try {
        const data = applySchema.parse(req.body)
        const file = req.file

        await sendEmail({
            ...data,
            file
        })

        return res.json({
            success: true,
            message: "Application sent successfully"
        })
    } catch (error) {
        logger.error(error)

        if (error.name === "ZodError") {
            return res.status(400).json({
                error: "Invalid input",
                details: error.errors
            })
        }

        return res.status(500).json({
            error: "Failed to send application"
        })
    }
}