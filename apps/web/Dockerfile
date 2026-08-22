# Development-only local container; it is not deployment configuration.
FROM node:25-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --package-lock=false
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
