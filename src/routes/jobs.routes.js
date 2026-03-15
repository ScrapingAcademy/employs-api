const express = require('express')
const controller = require('../controllers/jobs.controller')

const router = express.Router()

router.get('/', controller.getJobs)
router.get('/stream', controller.streamJobs)

module.exports = router