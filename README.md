# Library Seat Booking and Online Fee Renewal Management System

A full-stack library seat booking and online fee renewal management system built with Spring Boot, PostgreSQL, and React. The application supports student seat booking, fee renewals, notifications, and admin management.

## Tech Stack

- Backend: Java 17, Spring Boot 3.2.2, Maven
- Database: PostgreSQL
- Frontend: React 18, Vite, React Router v6
- Styling: Bootstrap 5, custom CSS
- Authentication: JWT
- Documentation: Swagger / OpenAPI

## Prerequisites

- Java 17
- Node.js 18+
- PostgreSQL 15
- Maven 3.9+

## Quick Start

1. Clone repo
2. Create PostgreSQL database named `librarydb`
3. Configure backend environment variables in `backend/.env.example`
4. Run backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
5. Run frontend:
   ```bash
   cd frontend
   npm run dev
   ```
6. Open: http://localhost:5173

## Default Login Credentials

- Student: `STU0001` / `password123`
- Admin: `ADMIN001` / `admin123`

## API Documentation

- http://localhost:8080/swagger-ui.html

## Project Structure

- `backend/` — Spring Boot application source and configuration
- `frontend/` — React Vite application source and styling
- `.gitignore` — ignores build artifacts, env files, IDE files

## Environment Variables

| Variable | Description |
|---|---|
| `DB_USERNAME` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing secret |
| `VITE_API_URL` | Frontend API base URL |
