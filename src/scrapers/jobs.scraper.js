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

    const contacts =
        lines.find(l => l.includes("encaminhar o currículo")) || ""
    
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