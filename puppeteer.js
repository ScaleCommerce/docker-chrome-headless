const EventEmitter = require('events');
const Browser = require('wappalyzer/browser');
const { Cluster } = require('puppeteer-cluster');

function puppeteerJsEvalFunction({ properties }) {
  Array.prototype.reduceWappalyzer || Object.defineProperty(Array.prototype, 'reduceWappalyzer', {
    value(r) {
      if (this === null) throw new TypeError();
      if (typeof r !== 'function') throw new TypeError();
      let e,
        t = Object(this),
        o = t.length >>> 0,
        i = 0;
      if (arguments.length >= 2) e = arguments[1]; else {
        for (; i < o && !(i in t);) i++;
        if (i >= o) throw new TypeError();
        e = t[i++];
      }
      for (; i < o;) i in t && (e = r(e, t[i], i, t)), i++;
      return e;
    },
  });

  let value = properties
    .reduceWappalyzer((parent, property) => (parent && parent[property]
      ? parent[property] : null), window);

  value = typeof value === 'string' || typeof value === 'number' ? value : !!value;
  return value;
}

let cluster = null;
let clusterLoading = null;

class PuppeteerBrowser extends Browser {
  constructor(options) {
    super(options);

    this.options = Object.assign({}, {
      userAgent: options.userAgent,
      waitDuration: options.maxWait,
      puppeteerClusterOptions: {
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 4,
        puppeteerOptions: {
          headless: true,
          ignoreHTTPSErrors: true,
        },
      },
    }, options);
    this.resources = [];

    this.document = {
      documentElement: true,
      getElementsByTagName: () => this.document.links,
    };

    this.links = [];
    this.scripts = [];
    this.window = {};
    this.cookies = [];
    this.page = null;
    this.statusCode = 0;
    this.contentType = '';

    // start cluster
    if ((!cluster) && (!clusterLoading)) {
      clusterLoading = new Promise((resolve, reject) => {
        Cluster.launch(this.options.puppeteerClusterOptions)
          .then(async (newCluster) => {
            cluster = newCluster;
            this.log('Cluster started', 'puppeteer');
            await cluster.task(async ({
              page, data: {
                url, cb, myContext, openBlock,
              },
            }) => {
              await myContext.visitInternal(page, url, cb);
              await openBlock;
            });
            resolve();
            clusterLoading = Promise.resolve();
          })
          .catch((err) => {
            this.log(`Cluster start error: ${err}`, 'puppeteer');
            reject(err);
            clusterLoading = Promise.reject(err);
          });
      });
    }
  }

  async visit(url) {
    await clusterLoading;
    let resolver = () => {};
    await new Promise((resolve, reject) => {
      cluster.queue({
        url,
        cb: resolve,
        myContext: this,
        openBlock: new Promise((res, rej) => {
          resolver = res;
        }),
      }).catch(reject);
    });


    return async () => {
      this.log('Closing page in puppeteer', 'puppeteer');
      resolver();
      // close the page to free up memory
      await this.page.close();
      this.page = null;
    };
  }

  async visitInternal(page, url, cb) {
    this.log(`Opening: ${url}`, 'puppeteer');

    this.resources = [];
    this.links = [];
    this.scripts = [];

    this.window = {};

    try {
      await page.setRequestInterception(true);
      if (this.page) {
        await this.page.close();
      }
      this.page = page;

      page.on('request', (req) => {
        req.continue();
      });

      page.on('response', (res) => {
        if ((res.status() === 301) || (res.status() === 302)) {
          return;
        }

        const headers = res.headers();
        const headList = [];
        Object.keys(headers).forEach((key) => {
          headList.push([key, headers[key]]);
        });

        this.resources.push({
          response: {
            headers: {
              _headers: headList,
            },
            status: res.status(),
          },
        });

        if (headers['content-type'] && (headers['content-type'].indexOf('javascript') !== -1 || headers['content-type'].indexOf('application/') !== -1)) {
          this.scripts.push(res.url());
        }

        if (this.statusCode === 0) {
          this.statusCode = res.status();
          this.contentType = headers['content-type'];
          const zombieHeaders = {};
          headList.forEach((header) => {
            if (!zombieHeaders[header[0]]) {
              zombieHeaders[header[0]] = [];
            }

            zombieHeaders[header[0]].push(header[1]);
          });
          this.headers = zombieHeaders;
        }
      });

      // navigate
      await page.setUserAgent(this.options.userAgent);
      try {
        await Promise.race([
          page.goto(url, { timeout: this.options.waitDuration, waitUntil: 'networkidle2' }),
          new Promise(x => setTimeout(x, this.options.waitDuration)),
        ]);
      } catch (err) {
        this.log(err.toString(), 'puppeteer', 'error');
      }

      // Nothing loaded, really just nothing
      if (this.resources.length === 0) {
        try {
          await cb('Nothing loaded...');
        } catch (err) {
          this.log(err.toString(), 'puppeteer', 'error');
        }

        // close the page to free up memory
        await page.close();
        this.page = null;
        return;
      }

      // get links
      const list = await page.evaluateHandle(() => Array.from(document.getElementsByTagName('a')).map(a => ({
        href: a.href,
        hostname: a.hostname,
        pathname: a.pathname,
        hash: a.hash,
        protocol: a.protocol,
      })));
      this.links = await list.jsonValue();

      // get cookies
      this.cookies = await page.cookies();
      this.cookies = this.cookies.map((e) => {
        e.key = e.name;
        return e;
      });

      // get html
      this.html = await page.content();

      // we are ready
      cb();
    } catch (err) {
      this.log(err.toString(), 'puppeteer', 'error');
      cb(err);
    }
  }

  async jsAsync(patterns) {
    this.log('Running async js evaluation', 'puppeteer', 'error');
    const js = {};
    if (!this.page) {
      return js;
    }

    for (const appName of Object.keys(patterns)) {
      js[appName] = {};

      for (const chain of Object.keys(patterns[appName])) {
        js[appName][chain] = {};
        const properties = chain.split('.');

        // grab value from window
        let value = null;

        try {
          value = await this.page.evaluate(puppeteerJsEvalFunction, { properties });
        } catch (err) {
          // this.log(err);
          value = null;
        }

        // check value
        if (value) {
          patterns[appName][chain].forEach((pattern, index) => {
            js[appName][chain][index] = value;
          });
        }
      }
    }

    return js;
  }
}

module.exports = PuppeteerBrowser;