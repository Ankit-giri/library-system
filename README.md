# Library Management System

A microservices-based library management platform supporting student seat booking, membership fee renewal, in-app notifications, and full admin management.

## Architecture

```
Browser
  └─ http://localhost:3000  (React / nginx)
       └─ API calls → http://localhost:8080  (API Gateway)
                          ├─ /api/auth/**          → auth-service       :8082
                          ├─ /api/students/**       → student-service    :8083
                          ├─ /api/seats/**          → seat-service       :8084
                          ├─ /api/bookings/**       → seat-service       :8084
                          ├─ /api/payments/**       → payment-service    :8085
                          ├─ /api/notifications/**  → notification-service :8086
                          ├─ /api/admin/dashboard** → auth-service       :8082
                          ├─ /api/admin/students/** → auth-service       :8082
                          ├─ /api/admin/bookings/** → seat-service       :8084
                          ├─ /api/admin/seats/**    → seat-service       :8084
                          ├─ /api/admin/reports/**  → payment-service    :8085
                          └─ /api/admin/emails/**   → notification-service :8086
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6, Bootstrap 5, Chart.js |
| API Gateway | Spring Cloud Gateway 3.2.2 |
| Services | Java 17, Spring Boot 3.2.2, Maven |
| Database | PostgreSQL 15 (one schema per service) |
| Auth | JWT (HMAC-SHA256) |
| Containerisation | Docker, Docker Compose |

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker + Docker Compose | Docker 24, Compose v2 |
| Java | 17 (for running without Docker) |
| Maven | 3.9+ (for running without Docker) |
| Node.js | 18+ (for running without Docker) |

---

## Running with Docker (recommended)

### 1. Configure environment variables

```bash
cd library-system
cp .env.example .env
```

Open `.env` and update the values if desired (the defaults work out of the box for local development).

### 2. Build and start all services

```bash
docker-compose up --build
```

The first build downloads Maven/Node dependencies and compiles all services — allow 5–10 minutes. Subsequent starts are fast.

### 3. Open the application

| URL | Description |
|-----|-------------|
| http://localhost:3000 | React frontend |
| http://localhost:8080 | API Gateway (all API calls) |
| http://localhost:8082 | Auth Service direct |
| http://localhost:8083 | Student Service direct |
| http://localhost:8084 | Seat Service direct |
| http://localhost:8085 | Payment Service direct |
| http://localhost:8086 | Notification Service direct |
| http://localhost:5432 | PostgreSQL (user: postgres) |

### 4. Useful commands

```bash
# Start in background
docker-compose up -d --build

# View logs for a specific service
docker-compose logs -f auth-service

# Stop all containers
docker-compose down

# Stop and remove volumes (resets all data)
docker-compose down -v

# Rebuild a single service after code changes
docker-compose up -d --build seat-service
```

---

## Running without Docker

### Prerequisites

- PostgreSQL 15 running locally on port 5432
- Java 17 + Maven 3.9+
- Node.js 18+

### 1. Create databases

Connect to PostgreSQL and run:

```sql
CREATE DATABASE library_auth;
CREATE DATABASE library_student;
CREATE DATABASE library_seat;
CREATE DATABASE library_payment;
CREATE DATABASE library_notification;
CREATE DATABASE library_admin;
```

### 2. Set environment variables

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export JWT_SECRET=zQJ0ZpPt4mPZVYh0Zc1nOe2P0ySmx3Ee2TPu3C5g8KU=
```

### 3. Start each microservice

Open a separate terminal for each service and run:

```bash
# Terminal 1 — Auth Service (port 8082)
cd auth-service
mvn spring-boot:run

# Terminal 2 — Student Service (port 8083)
cd student-service
mvn spring-boot:run

# Terminal 3 — Payment Service (port 8085)
cd payment-service
mvn spring-boot:run

# Terminal 4 — Seat Service (port 8084)
cd seat-service
mvn spring-boot:run

# Terminal 5 — Notification Service (port 8086)
cd notification-service
mvn spring-boot:run

# Terminal 6 — Admin Service (port 8087)
cd admin-service
mvn spring-boot:run

# Terminal 7 — API Gateway (port 8080)
cd api-gateway
mvn spring-boot:run
```

> **Note:** Start `payment-service` before `seat-service` since the booking service validates membership on startup via `PaymentClient`.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at http://localhost:5173 in development mode.

---

## Test Credentials

### Student Account

| Field | Value |
|-------|-------|
| Student ID | `STU0000001` |
| Email | `student@library.com` |
| Password | `Password1` |
| Role | `STUDENT` |

### Admin Account

| Field | Value |
|-------|-------|
| Email | `admin@library.com` |
| Password | `Admin@1234` |
| Role | `ADMIN` |

> These credentials must exist in your database. Register the student via `POST /api/auth/register` and create the admin directly in the database (set `role = 'ADMIN'` and `is_active = true`).

---

## API Documentation

Import `LibrarySystem.postman_collection.json` into Postman to test all 41 endpoints across 5 flows:

| Flow | Description |
|------|-------------|
| Flow 1 — Auth | Register, login, profile, logout |
| Flow 2 — Seat Booking | Availability, create, list, cancel |
| Flow 3 — Payment | Plans, membership, initiate, confirm |
| Flow 4 — Admin | Dashboard, student/seat/booking management, reports |
| Flow 5 — Notifications | Inbox, unread count, broadcast |

Run the flows in order — test scripts automatically save tokens and IDs as collection variables.

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `JWT_SECRET` | Base64-encoded HMAC-SHA256 key | _(must set)_ |
| `VITE_API_URL` | API Gateway URL (baked into frontend at build time) | `http://localhost:8080` |

Generate a new JWT secret:

```bash
openssl rand -base64 32
```

---

## Project Structure

```
library-system/
├── api-gateway/          Spring Cloud Gateway (port 8080)
├── auth-service/         Registration, login, JWT, admin student mgmt (port 8082)
├── student-service/      Student profile management (port 8083)
├── seat-service/         Seat inventory + booking engine (port 8084)
├── payment-service/      Membership plans + payment sessions (port 8085)
├── notification-service/ In-app notifications + email log (port 8086)
├── admin-service/        Placeholder — admin logic lives in owning services (port 8087)
├── frontend/             React 18 + Vite SPA
├── docker-compose.yml
```
