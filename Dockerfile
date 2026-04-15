FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Copy shared package
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src

# Copy server package
COPY packages/server/package.json packages/server/
COPY packages/server/tsconfig.json packages/server/
COPY packages/server/src packages/server/src

# Copy base tsconfig
COPY tsconfig.base.json ./

# Install dependencies
RUN npm install

# Build shared
RUN cd packages/shared && npx tsc

# Build server
RUN cd packages/server && npx tsc

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "packages/server/dist/index.js"]
