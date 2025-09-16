FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create auth directory with proper permissions
RUN mkdir -p /app/auth_info_baileys && chmod 755 /app/auth_info_baileys

# Expose port
EXPOSE 3008

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3008/health || exit 1

# Start the application
CMD ["npm", "start"]