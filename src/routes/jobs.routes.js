import express from 'express'
import * as controller from '../controllers/jobs.controller.js'

const router = express.Router()

router.get('/', controller.getJobs)
router.get('/stream', controller.streamJobs)
router.get('/scrape', controller.scrapeJob)

export default router