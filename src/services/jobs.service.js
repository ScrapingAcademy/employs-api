const scraper = require('../scrapers/jobs.scraper')
const { slicePagination } = require("../utils/pagination")

exports.getJobs = async (search, limit, cursor) => {
    const urls = await scraper.getJobUrls(search)

    const { items, nextCursor } =
        slicePagination(urls, limit, cursor)

    const jobs = await scraper.scrapeJobs(items)

    return {
        data: jobs,
        pagination: {
            nextCursor
        }
    }
}

exports.streamJobs = async (
    search,
    limit,
    cursor,
    sendEvent
) => {
    const urls = await scraper.getJobUrls(search)

    const { items, nextCursor } =
        slicePagination(urls, limit, cursor)

    await scraper.scrapeJobsStream(items, sendEvent)

    return nextCursor
}