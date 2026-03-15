// https://empregacampinas.com.br/?s=limpeza
// https://empregacampinas.com.br/page/2/?s=limpeza

const puppeteer = require('puppeteer')
let browser = null

const searchJobs = async (search, limit) => {
    browser = await puppeteer.launch({
        headless: true,
        userDataDir: '/tmp/myChromeSession'
    })

    const page = await browser.newPage()

    await page.goto(`https://empregacampinas.com.br/?s=${search}`, {
        waitUntil: "domcontentloaded"
    })

    // await page.evaluate((search) => {
    //     const input = document.querySelector('.navbar-form .input-group input')
    //     input.value = search

    // }, search)

    // await page.click('#btn-search')

    const urls = await page.$$eval('article .col-lg-8 a .thumbnail', (anchors, max) => {
        if (max && max > 0) {
            return anchors.slice(0, max).map(anchor => anchor.href)
        }
        return anchors.map(anchor => anchor.href)
    }, limit)

    const promises = urls.map(url => jobScraper(url))

    let results = null
    try {
        results = await Promise.all(promises)
        console.log('All data obtained successfully')
    } catch (error) {
        console.error('Error getting data: ', error)
    }

    await browser.close()

    return results

    // for (let link of links) {
    //     jobScraper(link)
    // }

    // document.querySelectorAll('article .col-lg-8 .thumbnail')
}

// document.querySelector('h1').innerText
// document.querySelector('.time').innerText
// document.querySelectorAll('.postie-post p')


// paragraps.filter((p, index, array) => p.innerText !== '' && !p.innerText.startsWith('ATENÇÃO') && index !== 0 && index !== array.length - 1).map(p => p.innerText)

const jobScraper = async (linkJob) => {
    const jobPage = await browser.newPage()
        try {
            await jobPage.goto(linkJob, { timeout: 0 })
            await jobPage.exposeFunction('contactScraper', contactScraper)
            const job = await jobPage.evaluate(async () => {
                const formatDateTime = (dateTime) => 
                    dateTime.substring(0, dateTime.indexOf('('))
                            .trim()
                            .replace(/\s+/g, ' ')
                            .replace(' / ', '/')
                const formatLines = (lines) => 
                    lines.map(p => p.innerText.replace(/\s+/g, ' ').trim())
                        .filter((text, index, array) => text !== '' && !text.startsWith('ATENÇÃO') && index !== array.length - 1)

                const formatText = (text) => text.substring(text.indexOf(':') + 1).trim()

                const title = document.querySelector('h1').innerText
                const dateTime = formatDateTime(document.querySelector('.time').innerText)

                const lines = formatLines(Array.from(document.querySelectorAll('.postie-post p')))

                const description = formatText(lines[0])
                const responsibilities = formatText(lines[1])
                const requirements = formatText(lines[2])
                const salary = formatText(lines[3])
                const benefits = formatText(lines[4])
                let observations = ''
                let contacts = {}
                if (lines[5].startsWith('Observações')) {
                    observations = formatText(lines[5])
                    contacts = await contactScraper(lines[6])
                } else {
                    contacts = await contactScraper(lines[5])
                }

                return { title, dateTime, description, responsibilities, requirements, salary, benefits, observations, contacts }
            })
            return job
        } catch (error) {
            console.error(error)
            return null
        } finally {
            await jobPage.close()
        }
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
    contactObj.deadline = line.substring(line.indexOf('até o dia') + 'até o dia'.length, line.lastIndexOf('.')).trim()

    return contactObj

}

module.exports = {
    searchJobs
}