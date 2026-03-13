const puppeteer = require('puppeteer')

const BASE_URL = 'https://empregacampinas.com.br'
const DEFAULT_TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 30000)
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || 4)

function mapLimit(items, limit, iteratee) {
  return new Promise((resolve, reject) => {
    const results = new Array(items.length)
    let inFlight = 0
    let cursor = 0
    let resolved = 0

    const launchNext = () => {
      if (resolved === items.length) {
        resolve(results)
        return
      }

      while (inFlight < limit && cursor < items.length) {
        const idx = cursor
        const item = items[cursor]
        cursor += 1
        inFlight += 1

        Promise.resolve(iteratee(item, idx))
          .then((value) => {
            results[idx] = value
          })
          .catch(reject)
          .finally(() => {
            inFlight -= 1
            resolved += 1
            launchNext()
          })
      }
    }

    if (items.length === 0) {
      resolve([])
      return
    }

    launchNext()
  })
}

function parseLabelValue(lines, label) {
  const row = lines.find((line) => line.toLowerCase().startsWith(label.toLowerCase()))
  if (!row) {
    return ''
  }

  const separatorIndex = row.indexOf(':')
  return separatorIndex >= 0 ? row.slice(separatorIndex + 1).trim() : row
}

function normalizeDateTime(text) {
  if (!text) return ''
  const bracketIndex = text.indexOf('(')
  const formatted = bracketIndex >= 0 ? text.slice(0, bracketIndex) : text
  return formatted.trim().replace(/\s+/g, ' ').replace(' / ', '/')
}

function contactScraper(line) {
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

  contactObj.fullText = line

  const deadlineStart = line.indexOf('até o dia')
  if (deadlineStart >= 0) {
    contactObj.deadline = line.substring(deadlineStart + 'até o dia'.length, line.lastIndexOf('.')).trim()
  }

  return contactObj
}

async function scrapeJobPage(browser, linkJob) {
  const jobPage = await browser.newPage()
  jobPage.setDefaultTimeout(DEFAULT_TIMEOUT_MS)

  try {
    await jobPage.goto(linkJob, { waitUntil: 'domcontentloaded' })
    await jobPage.exposeFunction('contactScraper', contactScraper)

    return await jobPage.evaluate(async () => {
      const text = (selector) => document.querySelector(selector)?.innerText?.trim() || ''

      const lines = Array.from(document.querySelectorAll('.postie-post p'))
        .map((p) => p.innerText.replace(/\s+/g, ' ').trim())
        .filter((line) => line !== '' && !line.startsWith('ATENÇÃO'))

      const contactLine = lines.find((line) => line.includes('Interessados') || line.includes('encaminhar') || line.includes('site')) || ''
      const observationsLine = lines.find((line) => line.toLowerCase().startsWith('observações')) || ''

      const contacts = contactLine ? await contactScraper(contactLine) : {}

      return {
        title: text('h1'),
        dateTime: text('.time'),
        description: lines.find((line) => line.toLowerCase().startsWith('descrição')) || '',
        responsibilities: lines.find((line) => line.toLowerCase().startsWith('responsabilidades')) || '',
        requirements: lines.find((line) => line.toLowerCase().startsWith('requisitos')) || '',
        salary: lines.find((line) => line.toLowerCase().startsWith('salário')) || '',
        benefits: lines.find((line) => line.toLowerCase().startsWith('benefícios')) || '',
        observations: observationsLine,
        contacts,
      }
    })
  } catch (error) {
    console.error('[scraper] failed to scrape job page', { linkJob, error: error.message })
    return null
  } finally {
    await jobPage.close()
  }
}

function normalizeJob(rawJob) {
  if (!rawJob) return null

  return {
    title: rawJob.title,
    dateTime: normalizeDateTime(rawJob.dateTime),
    description: parseLabelValue([rawJob.description], 'Descrição'),
    responsibilities: parseLabelValue([rawJob.responsibilities], 'Responsabilidades'),
    requirements: parseLabelValue([rawJob.requirements], 'Requisitos'),
    salary: parseLabelValue([rawJob.salary], 'Salário'),
    benefits: parseLabelValue([rawJob.benefits], 'Benefícios'),
    observations: parseLabelValue([rawJob.observations], 'Observações'),
    contacts: rawJob.contacts || {},
  }
}

const searchJobs = async (search, limit) => {
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: '/tmp/myChromeSession',
  })

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS)

    await page.goto(`${BASE_URL}/?s=${encodeURIComponent(search)}`, {
      waitUntil: 'domcontentloaded',
    })

    const urls = await page.$$eval('article .col-lg-8 .thumbnail', (anchors, max) => {
      const links = anchors.map((anchor) => anchor.href)
      if (Number.isInteger(max) && max > 0) {
        return links.slice(0, max)
      }
      return links
    }, limit)

    const jobs = await mapLimit(urls, MAX_CONCURRENCY, (url) => scrapeJobPage(browser, url))
    return jobs.map(normalizeJob).filter(Boolean)
  } finally {
    await browser.close()
  }
}

module.exports = {
  contactScraper,
  normalizeDateTime,
  parseLabelValue,
  searchJobs,
}
