# Stage 1: Build the React application
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Set build arguments for REACT_APP env variables
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_SOCKET_URL

# Expose arguments as env variables so the build process picks them up
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

COPY . .
RUN npm run build

# Stage 2: Serve React application using Nginx
FROM nginx:1.25-alpine
COPY --from=build-stage /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
