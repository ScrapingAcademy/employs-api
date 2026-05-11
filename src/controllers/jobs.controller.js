import logger from '../logger.js'
import * as jobsService from '../services/jobs.service.js'

export async function scrapeJob(req, res) {
    const url = typeof req.query.jobUrl === 'string' ? req.query.jobUrl.trim() : ''

    const isValidUrl = (url) => {
        try {
            new URL(url)
            return true
        } catch (error) {
            return false
        }
    }

    if (!url || !isValidUrl(url)) {
        return res.status(400).json({
            error: "valid url query parameter required"
        })
    }

    try {
        const job = await jobsService.scrapeJob(url)
        logger.info({ url }, "job scraped successfully")
        res.json(job)
    } catch (error) {
        logger.error(error)
        res.status(500).json({
            error: "failed to scrape job"
        })
    }
}

export async function getJobs(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limit = Number(req.query.limit) || 5
    const nextPageToken = req.query.nextPageToken || null

    if (!search) {
        return res.status(400).json({
            error: "search query parameter required"
        })
    }

    if (limit < 1 || limit > 15) {
        return res.status(400).json({
            error: "limit must be between 1 and 15"
        })
    }

    try {
        const result = await jobsService.getJobs(search, nextPageToken, limit)
        res.json(result)
    } catch (error) {
        logger.error(error)

        res.status(500).json({
            error: "failed to scrape jobs"
        })
    }

}

export async function streamJobs(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limit = Number(req.query.limit) || 5
    const nextPageToken = req.query.nextPageToken || null

    if (!search) {
        return res.status(400).json({
            error: "search query parameter required"
        })
    }

    if (limit < 1 || limit > 15) {
        return res.status(400).json({
            error: "limit must be between 1 and 15"
        })
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    // res.setHeader("Access-Control-Allow-Origin", "*")

    // send headers immediately to establish the SSE connection
    res.flushHeaders()

    const sendEvent = (data) => {
        res.write(`event: job\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    req.on('close', () => {
        logger.info("client disconnected from job stream")
        // res.end()
    })

    try {
        const data = await jobsService.streamJobs(
            search,
            nextPageToken,
            limit,
            sendEvent
        )

        logger.info({ data }, "page finished streaming")

        res.write(`event: nextPageToken\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)

    } catch (error) {
        logger.error(error)
        res.end()
    }
}

