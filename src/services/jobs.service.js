import * as scraper from '../scrapers/jobs.scraper.js'
import slicePagination from '../utils/pagination.js'
import logger from '../logger.js'

export async function getJobs(search, limit, cursor) {
    const urls = await scraper.getJobUrls(search)

    const { items, nextCursor } =
        slicePagination(urls, limit, cursor)

    const jobs = await scraper.scrapeJobs(items)

    logger.info({
        totalUrls: urls.length,
        limitedTo: items.length,
        success: jobs.length,
        failed: items.length - jobs.length
    }, "scraping stats")

    return {
        jobs,
        count: jobs.length,
        pagination: {
            nextCursor
        }
    }
}

export async function streamJobs(search, limit, cursor, sendEvent) {
    const urls = await scraper.getJobUrls(search)

    const { items, nextCursor } =
        slicePagination(urls, limit, cursor)

    await scraper.scrapeJobsStream(items, sendEvent)

    return {
        nextCursor,
        count: items.length
    }
}