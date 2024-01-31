FROM ubuntu:20.04

ENV CHROMIUM_BIN=/usr/bin/google-chrome \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    WORKDIR=/opt \
    DEBIAN_FRONTEND=noninteractive \
    APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=true \
    CI=1 \
    PATH=/opt/:/opt/node_modules/.bin/:$PATH

COPY lighthouse help.txt $WORKDIR/

WORKDIR $WORKDIR

RUN apt-get update && \
    apt-get -y dist-upgrade && \
    apt-get install -y --no-install-recommends ca-certificates wget gnupg apt-utils coreutils nano lsb-release && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    wget -q -O - https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs google-chrome-stable && \
    apt-get -y --purge autoremove && \
    apt-get -y autoclean && \
    rm -rf /var/lib/apt/* && \
    rm -rf /root/.cache && \
    useradd -ms /bin/bash chrome && \
    echo "cat $WORKDIR/help.txt" >> /home/chrome/.profile && \
    mkdir $WORKDIR/reports && \
    chown -R chrome:chrome $WORKDIR/

USER chrome

RUN npm install lighthouse && \
    npm install puppeteer && \
    npm prune && \
    npm cache clean --force && \
    echo "NodeJS version is $(node -v)" >> help.txt && \
    echo "npm version is $(npm -v)" >> help.txt && \
    echo "Lighthouse version is $(npm info lighthouse version)" >> help.txt && \
    echo "Puppeteer version is $(npm info puppeteer version)" >> help.txt && \
    echo $(google-chrome --version) >> help.txt && \
    echo "" >> help.txt

CMD ["/bin/bash", "-l"]