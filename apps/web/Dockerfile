# Production container for deployments that do not use Vercel.
FROM node:24-alpine AS build
WORKDIR /repo
COPY . .
RUN npm --prefix apps/web install --package-lock=false && node site/build.js && npm --prefix apps/web run build && npm --prefix apps/web prune --omit=dev

FROM node:24-alpine
WORKDIR /repo/apps/web
ENV NODE_ENV=production
COPY --chown=node:node --from=build /repo/apps/web ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
