# 1. Use a lightweight Node.js 20 image
FROM node:20-alpine

# 2. Create and set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package files first (helps with Docker caching)
COPY package*.json ./

# 4. Install only production dependencies
RUN npm install --omit=dev

# 5. Copy the rest of your application code
COPY . .

# 6. Expose the port your server listens on (from .env or 3000)
EXPOSE 3000

# 7. Start the server
CMD [ "node", "server.js" ]
