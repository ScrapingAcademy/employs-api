import logger from '../logger.js'
import * as jobsService from '../services/jobs.service.js'

export async function getJobs(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limit = Number(req.query.limit) || 5
    const cursor = Number(req.query.cursor) || 0

    if (!search) {
        return res.status(400).json({
            error: "search query required"
        })
    }

    try {
        const result = await jobsService.getJobs(search, limit, cursor)
        res.json(result)
    } catch (error) {
        console.error(error)

        res.status(500).json({
            error: "failed to fetch jobs"
        })
    }

}

export async function streamJobs(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limit = Number(req.query.limit) || 5
    const cursor = Number(req.query.cursor) || 0

    if (!search) {
        return res.status(400).json({
            error: "search query required"
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
            limit,
            cursor,
            sendEvent
        )

        logger.info({ data }, "page finished streaming")

        res.write(`event: cursor\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)

        res.end()
    } catch (error) {
        console.error(error)
        res.end()
    }
}

