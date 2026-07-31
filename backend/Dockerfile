FROM node:18-alpine

WORKDIR /app

# Copy package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy semua file
COPY . .

# Expose port
EXPOSE 3001

# Jalankan development
CMD ["npm", "run", "dev"]