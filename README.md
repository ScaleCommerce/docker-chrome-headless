# google chrome headless (and friends)

This image is mainly for automated testing. It provides:

* [Chrome headless](https://developers.google.com/web/updates/2017/04/headless-chrome)
* [Lighthouse](https://developers.google.com/web/tools/lighthouse/)
* [Wappalyzer](https://github.com/AliasIO/Wappalyzer)
* [cypress](https://www.cypress.io)

Intsalling all of these packages makes the image huge (1.3 GB) :-( It's currently based on Ubuntu 20.04, we've also tried Alpine, but this results in only 100 MB less. Diskspace is mainly eaten up by Node-Dependecies (350 MB), Cypress (500 MB) and Google Chrome (200 MB). We're open to suggestions how to minimize this.

## example usage

```
# find out what technologies are used on the site
docker run -ti --rm scalecommerce/chrome-headless wappalyzer https://www.google.com/

# save technologies to json file
docker run -ti --rm -v $(pwd):/opt/reports scalecommerce/chrome-headless wappalyzer https://www.google.com/ result.json

# get lighthouse report as html in current directory
docker run -ti --rm -v $(pwd):/opt/reports scalecommerce/chrome-headless lighthouse https://www.google.com/

# get lighthouse report as json on stdout
docker run -ti --rm scalecommerce/chrome-headless lighthouse --output json --output-path stdout https://www.google.com/


# don't limit network and emulate desktop
docker run -ti --rm -v $(pwd):/opt/reports scalecommerce/chrome-headless lighthouse https://www.google.com/ --throttling-method provided --preset desktop

```

## versions
```
NodeJS version is v20.11.0
npm version is 10.2.4
Lighthouse version is 11.5.0
Puppeteer version is 21.10.0
Google Chrome 121.0.6167.139
```