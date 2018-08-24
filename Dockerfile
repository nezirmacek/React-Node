FROM keymetrics/pm2:10-alpine

# create app folder and copy source files
RUN mkdir -p /usr/sounwise
COPY . /usr/soundwise

# install node modules
WORKDIR /usr/soundwise
RUN npm i

# build client bundle
RUN NODE_ENV=${NODE_ENV} npm run build

# expose port
EXPOSE 3000
