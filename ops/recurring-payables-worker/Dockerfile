FROM node:24.19.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts
COPY tsconfig.json tsconfig.worker.json ./
COPY src ./src
COPY scripts ./scripts
CMD ["npm", "run", "worker:recurring"]
