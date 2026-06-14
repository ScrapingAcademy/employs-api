import { z } from "zod"

export const applySchema = z.object({
    to: z.string().email(),
    subject: z.string().min(2),
    message: z.string().min(10),
    name: z.string().min(2),
    applicantEmail: z.string().email()
    // applicantEmail: z.string()
})