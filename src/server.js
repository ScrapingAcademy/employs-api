import express from 'express'
import pinoHttp from 'pino-http'
import logger from './logger.js'
import jobsRoutes from './routes/jobs.routes.js'
import pkg from '../package.json' with { type: 'json' }
import 'dotenv/config';
import cors from 'cors';

const port = process.env.PORT || 3001
const app = express()

app.use(express.json())
app.use(cors({
    origin: process.env.CLIENT_URL
}));
app.use(pinoHttp({ logger }))
app.use('/jobs', jobsRoutes)

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Employs API is running',
        version: pkg.version,
        timestamp: new Date().toISOString(),
        // environment: process.env.NODE_ENV || 'development'
    })
})

app.listen(port, () => {
    logger.debug(`Listening at http://localhost:${port}/`)
    logger.info(`Server running on port ${port}`)
})