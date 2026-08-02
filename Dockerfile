FROM node:18-alpine

WORKDIR /app

# Copy semua file dari folder backend
COPY backend/package*.json ./
RUN npm install

# Copy seluruh source code backend
COPY backend/ .

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]