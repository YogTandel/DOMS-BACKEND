# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the indexlication code
COPY . .

# Expose the port your Node.js index runs on (default is 3000, change if needed)
EXPOSE 3000

# Command to start your indexlication
CMD ["node", "index.js"]
