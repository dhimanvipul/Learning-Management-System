# SkillVerse — Learning Management System (LMS)

[![LMS MERN Docker CI Pipeline](https://github.com/dhimanvipul/Learning-Management-System/actions/workflows/docker-ci.yml/badge.svg)](https://github.com/dhimanvipul/Learning-Management-System/actions/workflows/docker-ci.yml)

SkillVerse is a premium, production-ready Learning Management System (LMS) built on the MERN stack (MongoDB, Express, React, Node.js). It integrates modules for course management, lesson content, student and instructor portals, automated real-time notifications via Socket.IO, secure authentication, file uploads via Cloudinary, and payments via Razorpay.

This repository is structured into two main sub-projects:
- **/Backend**: Node.js & Express REST API with MongoDB & Socket.IO.
- **/Frontend**: React-based SPA (Single Page Application) with a premium UI.

---

## Docker Setup & Local Execution Guide

We have containerized both applications using Docker and Docker Compose. This ensures identical environments between development and production, eliminates "localhost" routing discrepancies, and simplifies deployment.

### 1. Prerequisites

Before running the application with Docker, ensure you have the following installed on your machine:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Engine and Docker Compose v2)
- An active **MongoDB Atlas** database cluster (or local MongoDB server on the host machine)

### 2. Configuration (Environment Variables)

The Docker Compose configuration reads environment variables from a `.env` file in the project root directory.

1. Copy the `.env.example` template to a new `.env` file in the root:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and configure your credentials:
   - **Database**: Supply your MongoDB Atlas URI.
     *Note: If you want to connect to a MongoDB instance running on your host machine, use `mongodb://host.docker.internal:27017/dbname` instead of `localhost`.*
   - **Cloudinary**: Input your Cloud storage credentials.
   - **Razorpay**: Input your payment gateway keys.
   - **Nodemailer**: Input your SMTP user and app password for emails.
   - **Frontend build-time variables**: Keep `REACT_APP_API_BASE_URL=http://localhost/api/v1` and `REACT_APP_SOCKET_URL=http://localhost` if you are running locally. These leverage Nginx's reverse proxy to route client requests directly through port 80.

---

### 3. Docker Commands Reference

Run these commands from the root directory of the project (where `docker-compose.yml` is located).

#### A. Build the Images
To build or rebuild the Docker images for both Frontend and Backend:
```bash
docker compose build
```

#### B. Start the Containers
To start both containers in detached mode (background):
```bash
docker compose up -d
```
Once started, the services will be available at:
- **Frontend Panel**: [http://localhost](http://localhost) (Port 80)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

#### C. View Status and Logs
To check the status of running containers:
```bash
docker compose ps
```
To view real-time log output from all containers:
```bash
docker compose logs -f
```
To view logs for a specific service:
```bash
docker compose logs -f backend
# or
docker compose logs -f frontend
```

#### D. Rebuild and Run (Hot Update)
If you make changes to configurations or dependencies, rebuild and restart the containers with:
```bash
docker compose up -d --build
```

#### E. Stop the Containers
To stop and remove the running containers and networks:
```bash
docker compose down
```

---

### 4. Technical Architecture inside Docker

```
                   +------------------------------+
                   |       User's Browser         |
                   +--------------+---------------+
                                  |
                                  | HTTP & WebSockets (Port 80)
                                  v
+---------------------------------+---------------------------------+
| Docker Container (lms-frontend)                                  |
|                                                                   |
|   +---------------+     Proxy /api/ -> backend:5000               |
|   |  Nginx Server |     Proxy /socket.io/ -> backend:5000         |
|   +-------+-------+                                               |
|           | (Serves React static build)                           |
+-----------|-------------------------------------------------------+
            |
            +--------------> [ lms-network ] (Internal Bridge Network)
                                  |
                                  v
+---------------------------------+---------------------------------+
| Docker Container (lms-backend)                                    |
|                                                                   |
|   +-------------------+                                           |
|   | Express API Server| (Listens on Port 5000 internally)         |
|   +-------------------+                                           |
|                                                                   |
+---------------------------------+---------------------------------+
                                  |
                                  +--> MongoDB Atlas (Cloud Database)
                                  +--> Cloudinary (Cloud Storage)
                                  +--> Razorpay Gateway
                                  +--> Nodemailer SMTP
```

- **Nginx Reverse Proxy**: The frontend container runs Nginx, which serves the compiled React app on port 80. It also intercepts requests to `/api/` and `/socket.io/` and proxies them internally to the `backend` container on port 5000. This resolves all CORS issues and eliminates the need to expose backend ports.
- **Health Checks**: The backend image includes a Node-based health check that periodically checks if the server is responsive.

---

### 5. Common Troubleshooting

#### Issue: Backend container fails to connect to MongoDB
- **Cause**: The backend is configured with `localhost:27017` but runs inside a container, meaning it is trying to connect to its own localhost, not the host machine.
- **Solution**:
  1. For production/staging, use a **MongoDB Atlas** cloud URI.
  2. For local testing, use `mongodb://host.docker.internal:27017/dbname` in your `.env` file to refer to your host's database.

#### Issue: Port 80 or 5000 already in use
- **Cause**: You have another service (like local Nginx, Apache, or a standalone Node.js server) running on port 80 or 5000.
- **Solution**: Stop the conflicting local service or change the host port mapping in the `docker-compose.yml` file:
  ```yaml
  ports:
    - "8080:80"  # Map host port 8080 to container port 80
  ```

#### Issue: Changes to Frontend env variables not reflected
- **Cause**: React environment variables are injected at **build time**, not runtime.
- **Solution**: After updating `.env` file, you must rebuild the image using `docker compose up -d --build` or `docker compose build --no-cache`.

---

## CI/CD Pipeline (GitHub Actions)

A GitHub Actions workflow is configured in `.github/workflows/docker-ci.yml` to automatically run code quality, build, and containerization checks on every push or pull request to the `main` branch.

### How the Workflow Works

The pipeline executes the following checks sequentially:
1. **Repository Checkout**: Pulls the pushed code.
2. **Environment Setup**: Installs stable Node.js LTS (v20) and configures package caching.
3. **Frontend Validation**: Installs dependencies and verifies the React production build compile phase.
4. **Backend Validation**: Installs dependencies, spins up a temporary **MongoDB** service container inside the workflow environment, boots the Express server, and tests the active server instance via an HTTP health check.
5. **Docker Stack Verification**: Creates a mock environment config, runs `docker compose config` to validate compose configuration syntax, and builds the container images for both frontend and backend to verify that Dockerfile instructions are correct.

If any check fails, the pipeline will fail, preventing broken code from getting merged or deployed.

### Required GitHub Secrets

To make the workflow run and prepare for potential production deployments, the following secrets should be configured under **Settings > Secrets and Variables > Actions** in your GitHub repository:

| Secret Name | Description | Example Value |
| :--- | :--- | :--- |
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Storage Account Name | `duud68uo` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `919253875937991` |
| `CLOUDINARY_API_SECRET` | Cloudinary Secret Key | `************` |
| `MAIL_USER` | Gmail address for Nodemailer | `dhiman.vipul100@gmail.com` |
| `MAIL_PASS` | Gmail App Password for SMTP | `xxxx xxxx xxxx xxxx` |
| `RAZORPAY_KEY_ID` | Razorpay API Key | `rzp_test_xxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | `********************` |
| `JWT_SECRET` | Secret key used for signing JWTs | `your_secret_key` |
