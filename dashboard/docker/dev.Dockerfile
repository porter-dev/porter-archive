# Development environment
# -----------------------
FROM node:lts
WORKDIR /webpack

COPY package*.json ./

ENV NODE_ENV=development

RUN npm ci --legacy-peer-deps
RUN npm i -g http-parser-js

COPY . ./

CMD npm start
