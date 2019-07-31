FROM ubuntu:18.04

ENV CHROME_BIN=/usr/bin/google-chrome \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    WORKDIR=/opt \
    DEBIAN_FRONTEND=noninteractive \
    APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=true \
    CI=1 \
    PATH=/opt/:$PATH

COPY puppeteer.js package.json wappalyzer chrome-version.js wappalyzer lighthouse help.txt $WORKDIR/

WORKDIR $WORKDIR

RUN apt-get update && \
    apt-get -y dist-upgrade && \
    apt-get install -y --no-install-recommends ca-certificates wget gnupg apt-utils coreutils nano lsb-release&& \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    wget -q -O - https://deb.nodesource.com/setup_12.x | bash - && \
    apt-get install -y --no-install-recommends nodejs google-chrome-stable xvfb libgconf-2-4 libnss3 && \
    apt-get -y --purge autoremove && \
    apt-get -y autoclean && \
    rm -rf /var/lib/apt/* && \
    rm -rf /root/.cache && \
    useradd -ms /bin/bash chrome && \
    echo "cat $WORKDIR/help.txt" >> /home/chrome/.profile && \
    mkdir $WORKDIR/reports && \
    chown -R chrome:chrome $WORKDIR/

USER chrome

RUN npm install && \
    ln -sf ./node_modules/.bin/cypress cypress && \
    ./cypress verify && \
    echo "NodeJS version is $(node -v)" >> help.txt && \
    echo "npm version is $(npm -v)" >> help.txt && \
    echo "Wappalyzer version is $(npm info wappalyzer version)" >> help.txt && \
    echo "Lighthouse version is $(npm info lighthouse version)" >> help.txt && \
    echo "Puppeteer version is $(npm info puppeteer version)" >> help.txt && \
    echo "Cypress version is $(npm info cypress version)" >> help.txt && \
    echo "Chrome version is $(node chrome-version.js)" >> help.txt && \
    echo "" >> help.txt

CMD ["/bin/bash", "-l"]