FROM keymetrics/pm2:8-alpine

# create app folder and copy source files
RUN mkdir -p /usr/soundwise
COPY . /usr/soundwise

# update npm
RUN npm i -g npm

# install node modules
WORKDIR /usr/soundwise
RUN npm i

# build client bundle
RUN NODE_ENV=${NODE_ENV} npm run build

# expose port
EXPOSE 3000
