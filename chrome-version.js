const puppeteer = require('puppeteer');

(async () => {

const browser = await puppeteer.launch({
                executablePath: process.env.CHROME_BIN || null,
                args: ['--no-sandbox', '--headless']
            });
const page = await browser.newPage();
const version = await page.browser().version();
browser.close()
process.stdout.write(version);

})();

