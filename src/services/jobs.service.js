import logger from '../logger.js'
import * as scraper from '../scrapers/jobs.scraper.js'

export async function getJobs(search, nextPageToken, limit) {
    return await scraper.getJobs({ search, nextPageToken, limit })
}

export async function streamJobs(search, nextPageToken, limit, sendEvent) {
    const data = await scraper.getJobs({ search, nextPageToken, limit, streamSendEvent: sendEvent })
    return {
        nextPageToken: data.nextPageToken,
        count: data.jobs.length
    }
}

export async function scrapeJob(url) {
    logger.info({ url }, "scrapeJob service called with url")
    return {
        url,
        job: await scraper.scrapeJob(url)
    }
}