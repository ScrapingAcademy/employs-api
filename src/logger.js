import pino from 'pino'
import 'dotenv/config';

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty"
    }
})

export default logger