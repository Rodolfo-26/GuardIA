FROM node:22-slim

WORKDIR /app

COPY ["GuardIA web/guardia-panel/api/package.json", "GuardIA web/guardia-panel/api/package-lock.json", "./"]
RUN npm ci --omit=dev

COPY ["GuardIA web/guardia-panel/api/src", "./src"]

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]
