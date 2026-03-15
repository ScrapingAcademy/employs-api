import pLimit from 'p-limit'
import { getBrowser } from './browser.js'
const DEFAULT_TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 30000)

const limitConcurrency = pLimit(3)

export async function getJobUrls(search) {
    const browser = await getBrowser()
    const page = await browser.newPage()

    await page.goto(
        `https://www.empregacampinas.com.br/?s=${encodeURIComponent(search)}`,
        {
            timeout: DEFAULT_TIMEOUT_MS,
            waitUntil: "domcontentloaded"
        }
    )

    const urls = await page.$$eval(
        "article .col-lg-8 a.thumbnail",
        anchors => [...new Set(anchors.map(a => a.href))]   // remove duplicates
    )

    await page.close()
    return urls
}

async function scrapeJob(url) {
    const browser = await getBrowser()
    const page = await browser.newPage()

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

        return parseJob(rawJob)
    } finally {
        await page.close()
    }
}

function parseJob(rawJob) {
    const lines = rawJob.jobDetails.filter(
        text => text && !text.startsWith("ATENÇÃO")
    )

    const description = lines[0] || ""

    const responsibilities =
        lines.find(l => l.startsWith("Responsabilidades"))?.split(":")[1]?.trim() || ""

    const requirements =
        lines.find(l => l.startsWith("Requisitos"))?.split(":")[1]?.trim() || ""

    const salary =
        lines.find(l => l.startsWith("Salário"))?.split(":")[1]?.trim() || ""

    const benefits =
        lines.find(l => l.startsWith("Benefícios"))?.split(":")[1]?.trim() || ""

    const observations =
        lines.find(l => l.startsWith("Observações"))?.split(":")[1]?.trim() || ""

    const contactLine =
        lines.find(l => l.includes("encaminhar o currículo")) || ""
    
    const contacts = parseContact(contactLine)

    return {
        title: rawJob.title,
        dateTime: rawJob.dateTime,
        description,
        responsibilities,
        requirements,
        salary,
        benefits,
        observations,
        contacts
    }
}

function parseContact(line) {
    const contactObj = {}

    if (line.includes('e-mail')) {
        contactObj.type = 'email'
        contactObj.representative = line.substring((line.indexOf('aos cuidados de') + 'aos cuidados de'.length), line.indexOf('para')).trim()
        contactObj.email = line.substring(line.indexOf('e-mail') + 'e-mail'.length, line.indexOf('com a sigla')).trim()
        contactObj.subject = line.substring(line.indexOf('com a sigla') + 'com a sigla'.length, line.indexOf('no campo')).trim()

    } else if (line.includes('site')) {
        contactObj.type = 'site'
        contactObj.link = line.substring(line.indexOf('no site') + 'no site'.length, line.indexOf('para o código')).trim()

    } else if (line.includes('pessoalmente')) {
        contactObj.type = 'personally'
        contactObj.address = line.substring(line.indexOf('até o endereço') + 'até o endereço'.length, line.indexOf(', para a vaga')).trim()
    }

    contactObj.deadline = line.substring(line.indexOf('até o dia') + 'até o dia'.length, line.lastIndexOf('.')).trim()
    return contactObj
}

export async function scrapeJobs(urls) {
    const jobs = await Promise.all(
        urls.map(url =>
            limitConcurrency(() => scrapeJob(url))
        )
    )

    return jobs
}

export async function scrapeJobsStream (urls, sendEvent) {
    const tasks = urls.map(url =>
        limitConcurrency(async () => {
            const job = await scrapeJob(url)
            sendEvent(job)
        })
    )

    await Promise.all(tasks)
}