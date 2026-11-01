FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --registry=https://registry.npmmirror.com

COPY . .

EXPOSE 5174

CMD ["npm", "run", "serve:offline"]
