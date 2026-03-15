const puppeteer = require("puppeteer")

let browser = null

// singleton
exports.getBrowser = async () => {

  if (!browser) {

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"]
    })

  }

  return browser
}