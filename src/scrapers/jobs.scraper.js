import pLimit from 'p-limit'
import getBrowser from './browser.js'
import logger from '../logger.js'
import 'dotenv/config';

const DEFAULT_TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 30000)
// const limitConcurrency = pLimit(3)

export async function getJobs({ search, nextPageToken, limit = 5, streamSendEvent }) {

    let state = nextPageToken
        ? decodeToken(nextPageToken)
        : { search, page: 1, index: 0 }

    let urls = await getJobUrls(search, state.page)
    let totalUrls = urls.length

    const jobs = []
    let hasMore = true

    logger.info({ totalPageUrls: urls.length }, "starting job scraping")
    while (jobs.length < limit) {

        // page finished → next page
        if (state.index >= urls.length) {
            state.page++
            state.index = 0
            urls = await getJobUrls(search, state.page)
            totalUrls += urls.length
            logger.info({ totalPageUrls: urls.length, pageNumber: state.page }, "starting job scraping on next page")

            if (!urls.length) {
                hasMore = false
                break
            }

        }

        const url = urls[state.index]
        const job = await scrapeJob(url)

        if (job) {
            if (streamSendEvent) {
                logger.info("job scraped, sending to stream client")
                streamSendEvent(job)
            }

            jobs.push(job)
        }

        state.index++
    }

    const _nextPageToken = hasMore ? encodeToken(state) : null

    logger.info({
        totalUrls,
        limitedTo: limit,
        success: jobs.length,
        failed: totalUrls - jobs.length
    }, "scraping stats")

    return {
        jobs,
        nextPageToken: _nextPageToken
    }
}

async function getJobUrls(search, pageNumber = 1) {
    const browser = await getBrowser()
    const page = await browser.newPage()
    await setPageRequestInterceptor(page)

    logger.info({ search, pageNumber }, "Scraping job URLs")

    await page.goto(
        `https://www.empregacampinas.com.br/page/${pageNumber}/?s=${encodeURIComponent(search)}`,
        {
            timeout: DEFAULT_TIMEOUT_MS,
            waitUntil: "domcontentloaded"
        }
    )

    const urls = await page.$$eval(
        "article .col-lg-8 a.thumbnail",
        anchors => [...new Set(anchors.map(a => a.href))]   // remove duplicates
    )

    logger.debug('Closing job page')
    await page.close()
    return urls
}

function encodeToken(payload) {
    return Buffer.from(JSON.stringify(payload)).toString("base64")
}

function decodeToken(token) {
    return JSON.parse(Buffer.from(token, "base64").toString())
}

async function setPageRequestInterceptor(page) {
    await page.setRequestInterception(true)

    page.on("request", (req) => {
        const type = req.resourceType()

        if (["image", "stylesheet", "font", "media"].includes(type)) {
            req.abort()
        } else {
            req.continue()
        }

    })
}

export async function scrapeJob(url) {
    const start = Date.now()
    logger.debug({ url }, "scraping job page")

    const browser = await getBrowser()
    const page = await browser.newPage()
    await setPageRequestInterceptor(page)

    try {
        await page.goto(url, {
            timeout: DEFAULT_TIMEOUT_MS,
            waitUntil: "domcontentloaded"
        })

        const rawJob = await page.evaluate(() => {
            const clean = (text) =>
                text.replace(/\s+/g, " ").trim()

            const title =
                document.querySelector("h1 span")?.innerText || ""

            const dateTime =
                clean(document.querySelector(".time")?.innerText)
                    .split("(")[0]
                    .replace(" / ", "/")
                    .trim()

            const jobDetails = Array.from(
                document.querySelectorAll(".postie-post p")
            ).map(p => clean(p.innerText))

            return {
                title,
                dateTime,
                jobDetails
            }
        })

        logger.debug({ duration: Date.now() - start },
            "job page scraped successfully")

        if (rawJob.jobDetails.length) {
            const job = parseJob(rawJob)
            
            if (checkHasUndefined(job)) {
                logger.warn({ url, job: job }, "possible layout change detected")
            }

            return job
        } else {
            logger.warn({ url }, "no job details found on page")
            return null
        }

    } catch (error) {
        logger.error({ url, error }, "failed to scrape job page")
        return null
    } finally {
        logger.debug('Closing job page')
        await page.close()
    }
}

function parseJob(rawJob) {
    const lines = rawJob.jobDetails.filter(
        text => text && !text.startsWith("ATENÇÃO")
    )

    const description = lines[0] || ""

    const responsibilities =
        lines.find(l => l.startsWith("Responsabilidades"))?.split("Responsabilidades:")[1]?.trim() || ""

    const requirements =
        lines.find(l => l.startsWith("Requisitos"))?.split("Requisitos:")[1]?.trim() || ""

    const salary =
        lines.find(l => l.startsWith("Salário"))?.split("Salário:")[1]?.trim() || ""

    const benefits =
        lines.find(l => l.startsWith("Benefícios"))?.split("Benefícios:")[1]?.trim() || ""

    const observations =
        lines.find(l => l.startsWith("Observações"))?.split("Observações:")[1]?.trim() || ""

    const contacts =
        lines.find(l => l.includes("Os interessados deverão")) || ""

    const parsedContacts = parseContact(contacts)

    return {
        title: rawJob.title,
        dateTime: rawJob.dateTime,
        description,
        responsibilities,
        requirements,
        salary,
        benefits,
        observations,
        contacts: parsedContacts
    }
}

function parseContact(rawContact) {
    const contact = {}

    switch (true) {
        case rawContact.includes('e-mail'):
            contact.type = 'email'
            contact.representative = rawContact.substring((rawContact.indexOf('aos cuidados de') + 'aos cuidados de'.length), rawContact.indexOf('para')).trim()
            contact.email = rawContact.substring(rawContact.indexOf('e-mail') + 'e-mail'.length, rawContact.indexOf('com a sigla')).trim()
            contact.subject = rawContact.substring(rawContact.indexOf('com a sigla') + 'com a sigla'.length, rawContact.indexOf('no campo')).trim()
            break
        case rawContact.includes('site'):
            contact.type = 'site'
            contact.link = rawContact.substring(rawContact.indexOf('no site') + 'no site'.length, rawContact.indexOf('para o código')).trim()
            break
        case rawContact.includes('pessoalmente'):
            contact.type = 'personally'
            contact.address = rawContact.substring(rawContact.indexOf('até o endereço') + 'até o endereço'.length, rawContact.indexOf(', para a vaga')).trim()
            break
    }

    contact.deadline = rawContact.substring(rawContact.indexOf('até o dia') + 'até o dia'.length, rawContact.lastIndexOf('.')).trim()
    return contact
}

function checkHasUndefined(obj) {
    return Object.values(obj).some(value => {
        if (value && typeof value === 'object') {
            return checkHasUndefined(value); // Verifica dentro de 'contacts'
        }
        return !value;
    });
}

// export async function scrapeJobs(urls) {
//     logger.info({ totalUrls: urls.length }, "starting job scraping")
//     const jobs = await Promise.all(
//         urls.map(url =>
//             limitConcurrency(() => scrapeJob(url))
//         )
//     )

//     logger.info({ totalJobs: jobs.length }, "scraping finished")
//     return jobs
// }

// export async function scrapeJobsStream(urls, sendEvent) {
//     logger.info({ totalUrls: urls.length }, "starting job scraping stream")
//     const tasks = urls.map(url =>
//         limitConcurrency(async () => {
//             const job = await scrapeJob(url)
//             logger.info("job scraped, sending to client")
//             sendEvent(job)
//         })
//     )

//     await Promise.all(tasks)
// }