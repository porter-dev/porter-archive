# Development environment
# -----------------------
FROM node:latest
WORKDIR /webpack

COPY package*.json ./

RUN npm i

ENV NODE_ENV=development

COPY . ./

CMD npm start