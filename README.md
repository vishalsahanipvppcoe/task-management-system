# Kaniska Task Management System

A robust, enterprise-grade Task Management RESTful API built with Node.js, Express.js, and MySQL. The system enforces strict Role-Based Access Control (RBAC) and resource ownership verification, ensuring secure task lifecycle management for both standard users and administrators.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Design](#database-design)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Migration](#migration)
- [Seeding](#seeding)
- [Running the Application](#running-the-application)
- [Postman Testing](#postman-testing)
- [Test Credentials](#test-credentials)
- [Error Handling](#error-handling)
- [Security Measures](#security-measures)
- [Assumptions](#assumptions)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Project Overview
The Kaniska Task Management System is designed to serve as a reliable, production-ready backend assessment implementation. It allows users to register, log in, create tasks, and manage their assigned workloads while preventing unauthorized access or privilege escalation. 

A dual-role model (`user` and `admin`) regulates operational privileges:
- **Regular Users** retain full CRUD capability over their own tasks, but are strictly prohibited from viewing or editing other users' tasks and cannot update task statuses.
- **Admin Users** possess administrative visibility across the entire system, can manage tasks system-wide, and exclusively control task status transitions.

---

## Features
- **Stateless Authentication**: JSON Web Tokens (JWT) with configurable expiration.
- **Password Security**: Strong hashing with `bcryptjs` using 10 salt rounds.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `user` and `admin` roles.
- **Resource Ownership Enforcement**: User tasks are isolated; unauthorized cross-user modifications or views yield `403 Forbidden`.
- **Status State Machine Control**: Only administrators can modify task status values (`Pending`, `In Progress`, `Testing`, `Completed`).
- **Data Validation**: Strict input schema validation and sanitization using Joi.
- **Automated Schema Migrations**: Zero-dependency migration runner tracking database revisions.
- **Idempotent Seeders**: Automated seeding for demo and assessment accounts without creating duplicates.
- **Centralized Error Handling**: Uniform error envelopes that guard sensitive internal server/database details.
- **Fully Parameterized Queries**: Strict protection against SQL Injection using `mysql2/promise`.

---

## Technology Stack
- **Runtime**: Node.js (v18+ / v20+ / v24+)
- **Framework**: Express.js
- **Database**: MySQL 8.x
- **Database Driver**: `mysql2/promise` (connection pooling)
- **Authentication**: `jsonwebtoken` (JWT)
- **Cryptography**: `bcryptjs`
- **Validation**: `joi`
- **Environment Management**: `dotenv`
- **CORS Handling**: `cors`
- **Process Manager (Dev)**: `nodemon`

---

## Architecture
The application implements a clean layered architecture adhering to the Single Responsibility Principle:

```
Client (Postman / Browser / Mobile)
               │
               ▼
        Express Routes
               │
               ▼
   Authentication Middleware (JWT verification)
               │
               ▼
   Authorization Middleware (Role & Permission checks)
               │
               ▼
   Validation Middleware (Joi Schema inspection)
               │
               ▼
          Controllers (Request parsing & Response dispatch)
               │
               ▼
            Services (Business logic & Ownership verification)
               │
               ▼
         Database Layer (MySQL Connection Pool with Parameterized Queries)
```

### Layer Responsibilities
- **Routes (`src/routes/`)**: Map HTTP endpoints, wire relevant middlewares, and dispatch to controllers. Contains no business or database logic.
- **Middleware (`src/middleware/`)**: Inspects requests, decodes JWTs, enforces role permissions, validates incoming payloads, and catches errors.
- **Controllers (`src/controllers/`)**: Extracts request bodies/parameters, passes them into services, and formats standard HTTP responses.
- **Services (`src/services/`)**: Orchestrates business rules, performs ownership checks (`task.user_id === req.user.id`), and executes database queries.
- **Validators (`src/validators/`)**: Declarative Joi schemas for request body parameters.
- **Utils (`src/utils/`)**: Reusable helper functions for JWT generation/verification and password hashing.
- **Config (`src/config/`)**: Database connection pool and runtime settings.

---

## Project Structure
```
D:\Kaniska_task-management-system
├── src/
│   ├── config/
│   │   └── database.js               # MySQL connection pool configuration
│   ├── controllers/
│   │   ├── auth.controller.js        # Controller for user registration and login
│   │   └── task.controller.js        # Controller for task operations
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT extraction and validation
│   │   ├── error.middleware.js       # Centralized error and 404 handlers
│   │   ├── role.middleware.js        # Role-based authorization middleware
│   │   └── validation.middleware.js  # Joi schema validation middleware
│   ├── migrations/
│   │   ├── 001_create_users.js       # Users table definition
│   │   ├── 002_create_tasks.js       # Tasks table definition
│   │   └── runner.js                 # Programmatic migration orchestrator
│   ├── routes/
│   │   ├── auth.routes.js            # /api/auth route definitions
│   │   └── task.routes.js            # /api/tasks route definitions
│   ├── seeders/
│   │   └── seed.js                   # Idempotent seeding script for default users
│   ├── services/
│   │   ├── auth.service.js           # Auth business logic & DB operations
│   │   └── task.service.js           # Task business logic & ownership validation
│   ├── utils/
│   │   ├── jwt.js                    # JWT signing and verification helpers
│   │   └── password.js               # Bcrypt hashing and comparison helpers
│   ├── validators/
│   │   ├── auth.validator.js         # Joi schemas for authentication
│   │   └── task.validator.js         # Joi schemas for tasks
│   ├── app.js                        # Express application setup
│   └── server.js                     # Server entry point & listener
├── postman/
│   └── Task-Management-System.postman_collection.json # Exported Postman collection
├── test/
│   └── verify-endpoints.js           # Automated end-to-end API test suite
├── .env.example                      # Template for environment variables
├── .gitignore                        # Git ignore file (excludes .env and node_modules)
├── package.json                      # Project manifest and scripts
├── package-lock.json                 # Dependency lockfile
├── README.md                         # Project documentation
└── INTERVIEW_GUIDE.md                # Comprehensive technical interview guide
```

---

## Database Design

The relational database model consists of two core tables linked with foreign-key constraints.

### 1. `users` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `name` | `VARCHAR(255)` | NOT NULL | User's full name |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE, INDEX | User's unique email address |
| `password` | `VARCHAR(255)` | NOT NULL | Bcrypt hashed password |
| `role` | `ENUM('user', 'admin')` | NOT NULL, DEFAULT 'user' | Assigned authorization role |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP | Record modification timestamp |

### 2. `tasks` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | Unique task identifier |
| `user_id` | `INT` | NOT NULL, FOREIGN KEY, INDEX | Reference to `users(id)` (`ON DELETE CASCADE`) |
| `title` | `VARCHAR(255)` | NOT NULL | Task title (1 - 255 chars) |
| `description` | `TEXT` | NULL | Optional task description |
| `status` | `ENUM(...)` | NOT NULL, DEFAULT 'Pending' | 'Pending', 'In Progress', 'Testing', 'Completed' |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Task creation timestamp |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP | Task modification timestamp |

### Relationships & Indexes
- **1-to-Many**: One User has many Tasks (`users 1 ─── N tasks`).
- **Integrity**: `ON DELETE CASCADE` guarantees that deleting a user removes all their associated tasks cleanly.
- **Indexes**: `users(email)` for fast credential lookups; `tasks(user_id)` for high-performance task queries.

---

## Authentication
Authentication is implemented using stateless JSON Web Tokens (JWT).
1. Client submits credentials via `POST /api/auth/login`.
2. Service locates the user and validates password using `bcryptjs.compare()`.
3. An access token is signed with a minimal payload:
   ```json
   {
     "id": 1,
     "role": "user"
   }
   ```
4. Client provides the token in subsequent requests via the HTTP header:
   ```http
   Authorization: Bearer <token>
   ```
5. `auth.middleware.js` verifies the token using `process.env.JWT_SECRET` and attaches decoded claims to `req.user`.

---

## Authorization

### 1. Role-Based Access Control (RBAC)
- Handled by `requireRole('admin')`.
- Compares `req.user.role` with allowed roles.
- Returns `403 Forbidden` if unauthorized.
- Applied to status modification endpoint: `PATCH /api/tasks/:id/status`.

### 2. Resource Ownership Authorization
- Validated at the service layer for task retrieval and modification.
- Evaluated as:
  ```
  Is req.user.role === 'admin'?
    ├── YES ──> Allow operation
    └── NO  ──> Is task.user_id === req.user.id?
                 ├── YES ──> Allow operation
                 └── NO  ──> Deny with 403 Forbidden
  ```
- Clients cannot supply arbitrary `user_id` in request payloads. The owner is always assigned server-side from `req.user.id`.

---

## API Endpoints

### Health Check
- `GET /api/health`
  - Public
  - Returns `200 OK`: `{"success": true, "message": "Task Management API is running"}`

### Authentication Endpoints
- `POST /api/auth/register`
  - Public
  - Body: `{"name": "string", "email": "string", "password": "string"}`
  - Returns `201 Created`
  - Duplicate email returns `409 Conflict`
- `POST /api/auth/login`
  - Public
  - Body: `{"email": "string", "password": "string"}`
  - Returns `200 OK` with JWT token and user profile

### Task Endpoints
- `POST /api/tasks`
  - Protected (User, Admin)
  - Body: `{"title": "string", "description": "optional string"}`
  - Returns `201 Created`
- `GET /api/tasks`
  - Protected (User, Admin)
  - Regular User: Returns only tasks owned by caller.
  - Admin: Returns all tasks across all users.
  - Returns `200 OK`
- `GET /api/tasks/:id`
  - Protected (User, Admin)
  - Regular User: Returns own task (or `403 Forbidden` if owned by another user).
  - Admin: Returns any task.
  - If task doesn't exist: `404 Not Found`.
  - Returns `200 OK`
- `PUT /api/tasks/:id`
  - Protected (User, Admin)
  - Body: `{"title": "string", "description": "optional string"}`
  - Regular User: Can only edit own tasks.
  - Admin: Can edit any task.
  - Returns `200 OK`
- `PATCH /api/tasks/:id/status`
  - Protected (Admin Only)
  - Body: `{"status": "Pending" | "In Progress" | "Testing" | "Completed"}`
  - Regular User: `403 Forbidden`
  - Admin: `200 OK`

---

## Environment Variables
The application uses `.env` for runtime configuration. A template `.env.example` is provided:

```ini
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=task_management
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=1d
```

> **Security Note:** `.env` is listed in `.gitignore` and must never be committed to source control.

---

## Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MySQL**: 8.0 or higher running on port 3306

---

## Installation
Clone or navigate to the repository directory and install dependencies:

```bash
cd D:\Kaniska_task-management-system
npm install
```

---

## Database Setup
1. Ensure your MySQL server is running.
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update `DB_USER` and `DB_PASSWORD` in `.env` to match your local MySQL configuration.

---

## Migration
Run database migrations using the npm script:

```bash
npm run migrate
```

This script:
1. Connects to MySQL and creates database `task_management` if it does not already exist.
2. Creates the tracking table `schema_migrations`.
3. Runs `001_create_users.js` and `002_create_tasks.js` sequentially.
4. Is completely idempotent and safe to re-run.

---

## Seeding
Seed default user credentials into the database:

```bash
npm run seed
```

This script creates or updates the default `Admin` and `Regular User` accounts with properly hashed passwords.

---

## Running the Application

### Development Mode (with hot-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

### Run Automated End-to-End Tests:
```bash
npm test
```

---

## Postman Testing
A complete Postman collection is located at:
`postman/Task-Management-System.postman_collection.json`

### Importing into Postman:
1. Open Postman.
2. Click **Import** in the upper left.
3. Select `postman/Task-Management-System.postman_collection.json`.

### Features of the Collection:
- **Collection Variables**:
  - `baseUrl`: `http://localhost:5000/api`
  - `userToken`: Automatically captured on login
  - `adminToken`: Automatically captured on login
  - `taskId`: Automatically captured when creating tasks
- **Folder Breakdown**:
  - `Authentication` (Register, Login User, Login Admin)
  - `Tasks - Regular User` (Create, Get All Own, Get Single Own, Update Own)
  - `Tasks - Admin` (Get All Tasks, Get Any Task, Update Any Task, Update Status)
  - `Authorization Tests` (Status Update Denied 403, Cross-User Denied 403, Missing Token 401, Invalid Token 401)

---

## Test Credentials
The database seeder provisions these default accounts:

### Administrator
- **Email**: `admin@example.com`
- **Password**: `Admin@123`
- **Role**: `admin`

### Regular User
- **Email**: `user@example.com`
- **Password**: `User@123`
- **Role**: `user`

---

## Error Handling
The API employs centralized error handling via `error.middleware.js` returning uniform JSON responses:

### Standard Error Response:
```json
{
  "success": false,
  "message": "Task not found"
}
```

### Validation Error Response (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "\"title\" is required"
  ]
}
```

### Standard HTTP Status Codes Used:
- `200 OK`: Successful retrieval, update, or login.
- `201 Created`: Resource successfully created (Task, User registration).
- `400 Bad Request`: Input validation failed or malformed request.
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Authenticated, but lacking permission (e.g., cross-user task access, non-admin status update).
- `404 Not Found`: Target resource does not exist.
- `409 Conflict`: Duplicate resource (e.g., email already registered).
- `500 Internal Server Error`: Generic unhandled server failure (sanitized, stack traces hidden).

---

## Security Measures
- **SQL Injection Prevention**: All queries use parameterized statements (`?`) with `mysql2/promise`.
- **Password Protection**: Passwords are encrypted using `bcryptjs` with salt rounds of 10. Passwords and hashes are never returned in responses.
- **Privilege Separation**: Strict RBAC enforced via middlewares and services.
- **Ownership Validation**: Verified at the service layer; users cannot view or manipulate other users' data.
- **Payload Sanitization**: Joi strictly validates body fields; arbitrary or injected fields like `user_id` are prohibited.
- **Safe Secrets**: All credentials and secrets are loaded from environment variables and excluded from Git.

---

## Assumptions
- Each task belongs to exactly one user (`1:N` relationship).
- Tasks are initialized with a default status of `Pending`.
- Only users with the `admin` role are permitted to advance or change task statuses.
- Soft deletes are not required; task deletion cascades when a user is removed.

---

## Future Improvements
- **Pagination and Filtering**: Add cursor-based or limit/offset pagination and query filters (by status, title).
- **Refresh Tokens**: Implement refresh token rotation for longer sessions.
- **Task Assignment**: Allow admins or managers to reassign tasks to other users.
- **Activity Auditing**: Create an audit log table recording task status transition history.
- **Rate Limiting**: Add `express-rate-limit` to prevent brute force attacks on auth endpoints.

---

## Author
**Kaniska**  
Node.js Backend Developer
