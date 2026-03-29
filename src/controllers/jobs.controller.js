import logger from '../logger.js'
import * as jobsService from '../services/jobs.service.js'

export async function getJobs(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limit = Number(req.query.limit) || 5
    const nextPageToken = req.query.nextPageToken || null

    if (!search) {
        return res.status(400).json({
            error: "search query required"
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
            error: "failed to fetch jobs"
        })
    }

}

export async function streamJobs(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limit = Number(req.query.limit) || 5
    const nextPageToken = req.query.nextPageToken || null

    if (!search) {
        return res.status(400).json({
            error: "search query required"
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

    const sendEvent = (data) => {
        res.write(`event: job\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

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

        res.end()
    } catch (error) {
        logger.error(error)
        res.end()
    }
}

