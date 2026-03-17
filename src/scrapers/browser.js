import puppeteer from 'puppeteer'

let browser = null

// singleton
export default async function getBrowser() {
  if (!browser) {

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"]
    })

  }

  return browser
}