import express from 'express'
import * as jobsController from '../controllers/jobs.controller.js'
import { applyJob } from "../controllers/apply.controller.js"
import { upload } from "../middlewares/upload.middleware.js"
import logger from "../logger.js"

const router = express.Router()

router.get('/', jobsController.getJobs)
router.get('/stream', jobsController.streamJobs)
router.get('/scrape', jobsController.scrapeJob)
router.post(
    '/apply',
    upload.single('resume'),
    applyJob
)

export default router