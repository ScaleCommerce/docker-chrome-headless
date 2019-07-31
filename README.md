# google chrome headless (and friends)

This image is mainly for automated testing. It provides:

* [Chrome headless](https://developers.google.com/web/updates/2017/04/headless-chrome)
* [Lighthouse](https://developers.google.com/web/tools/lighthouse/)
* [Wappalyzer](https://github.com/AliasIO/Wappalyzer)
* [cypress](https://www.cypress.io)

Intsalling all of these packages makes the image huge (1.3 GB) :-( It's currently based on Ubuntu 18.04, we've also tried Alpine, but this results in only 100 MB less. Diskspace is mainly eaten up by Node-Dependecies (350 MB), Cypress (500 MB) and Google Chrome (200 MB). We're open to suggestions how to minimize this.

## example usage

```
docker run -ti --rm scalecommerce/chrome-headless wappalyzer https://www.google.com/

docker run -ti --rm -v $(pwd):/opt/reports scalecommerce/chrome-headless lighthouse https://www.google.de/
```
