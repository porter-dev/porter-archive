# Development environment
# -----------------------
FROM node:latest
WORKDIR /webpack

COPY package*.json ./

ENV NODE_ENV=development

RUN npm install
RUN npm i -g http-parser-js

COPY . ./

CMD npm start -- --host 0.0.0.0