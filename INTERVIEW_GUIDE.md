# Technical Interview Guide: Kaniska Task Management System

This guide is designed to prepare you to walk through, defend, and explain every design and architectural decision of the **Kaniska Task Management System** in a senior backend engineering interview.

---

## 1. Project Overview
The Kaniska Task Management System is a production-grade REST API backend built using Node.js, Express.js, and MySQL. It demonstrates modern backend patterns:
- Stateless JWT-based authentication.
- Cryptographic password hashing using `bcryptjs`.
- Dual-layer authorization: **Role-Based Access Control (RBAC)** and **Resource Ownership Verification**.
- Schema migrations and idempotent seeders.
- Strict input validation using Joi schemas.
- Centralized operational error handling.
- Connection pooling and SQL injection defense via parameterized queries.

---

## 2. Architectural Design: Layered Architecture
The application follows a clean 5-tier layered architecture:
```
Client Request (Postman / Web App)
              │
              ▼
         Routes Layer        (Endpoint definition & middleware mounting)
              │
              ▼
       Middleware Layer      (Auth, RBAC, Validation, Error Handling)
              │
              ▼
      Controllers Layer      (HTTP request unpacking & response formatting)
              │
              ▼
        Services Layer       (Business logic, ownership validation, DB execution)
              │
              ▼
        Database Layer       (MySQL Connection Pool with Parameterized Queries)
```

### Why Layered Architecture?
- **Separation of Concerns**: Each layer has one reason to change.
- **Maintainability**: Routes only route, controllers only handle HTTP status codes/envelopes, services only execute business logic and data queries.
- **Testability**: Services can be tested in isolation without spinning up HTTP servers or mocking Express `req`/`res`.

---

## 3. Core Technical Decisions

### Why Express.js?
- **Minimalist & Unopinionated**: Gives full granular control over routing, middleware pipelines, and error handling.
- **Middleware-Driven**: Perfect for executing cross-cutting concerns (authentication, authorization, validation, logging) sequentially before hitting route handlers.

### Why MySQL?
- **ACID Compliance**: Ensures strong consistency, transactional integrity, and data safety.
- **Relational Integrity**: Foreign keys (`user_id -> users.id`) with `ON DELETE CASCADE` guarantee referential integrity at the database engine level.
- **Indexing**: B-Tree indexes on `email` and `user_id` provide $O(\log n)$ lookup speed.

### Why Middleware?
- Intercepts requests before reaching the controller.
- Ensures DRY (Don't Repeat Yourself) code: authentication, role authorization, and validation logic run as modular reusable units across multiple routes.

### Why Services?
- Controllers should remain "thin". If controllers contained SQL queries and business logic, code would become tightly coupled to the HTTP protocol.
- By placing business logic in services, the same logic can be reused in background jobs, CLI commands, or WebSocket handlers without changing a single line of SQL.

---

## 4. Authentication Flow (JWT & Bcrypt)

### Password Hashing Flow (`bcryptjs`):
1. User submits plaintext password during registration (`POST /api/auth/register`).
2. Plaintext password is never stored or logged.
3. It is hashed using `bcrypt.hash(password, 10)` which generates a salt and applies a computationally expensive one-way key derivation function.
4. The resulting hash includes the algorithm, cost factor, salt, and hash string.
5. On login, `bcrypt.compare(candidatePassword, storedHash)` verifies the password without ever needing to decrypt it.

### JWT Token Lifecycle:
1. User provides credentials to `POST /api/auth/login`.
2. Service validates credentials and signs a JWT containing minimal claims:
   ```json
   {
     "id": 1,
     "role": "user"
   }
   ```
3. The token is signed using `HMAC SHA-256` with `process.env.JWT_SECRET` and an expiration time (`1d`).
4. Sensitive details (e.g., password hash, credit card, phone) are **never** put into the JWT payload, as JWT payloads are only Base64Url-encoded and can be read by anyone who intercepts the token.
5. Subsequent requests provide the token in the `Authorization: Bearer <token>` header.
6. `auth.middleware.js` extracts, verifies, and attaches the payload to `req.user`.

---

## 5. Authorization: RBAC vs Resource Ownership

### 1. Role-Based Access Control (RBAC):
- Governs what **categories of actions** a user can execute based on their system role (`user` vs `admin`).
- Implemented in `src/middleware/role.middleware.js`:
  ```javascript
  const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
  ```
- **Use Case**: Status updates (`PATCH /api/tasks/:id/status`) are protected by `requireRole('admin')`. Regular users receive `403 Forbidden`.

### 2. Resource Ownership:
- Governs whether a user is allowed to access or mutate a **specific data instance**.
- Implemented in `src/services/task.service.js`:
  ```javascript
  if (user.role !== 'admin' && task.user_id !== user.id) {
    throw new AppError('You are not authorized to view this task', 403);
  }
  ```
- **Use Case**: Regular user A cannot view or edit Task 50 owned by User B. Even if User A possesses a valid JWT, the service layer rejects the request with `403 Forbidden`.

---

## 6. Security Decisions & Vulnerability Defenses

| Threat | Mitigation in This Project |
|---|---|
| **SQL Injection** | Exclusively parameterized queries (`?`) using `mysql2/promise`. Never concatenate strings into SQL queries. |
| **Privilege Escalation** | `user_id` is never accepted from request body during task creation; it is forced from `req.user.id`. |
| **Credential Leakage** | Database queries explicitly omit the `password` column when returning user profiles. `.env` is git-ignored. |
| **Cross-User Data Leakage** | Explicit ownership verification on individual resource access (`GET /api/tasks/:id`, `PUT /api/tasks/:id`). |
| **Brute Force Tampering** | Joi strict schema validation (`.unknown(false)`) prevents unexpected fields from polluting models. |
| **Information Disclosure** | Centralized error handler sanitizes 500 error messages and never prints stack traces in production responses. |

---

## 7. Scaling and Future Architecture

If this system scaled to millions of tasks and requests:
1. **Database Indexing & Partitioning**:
   - Add composite indexes like `(user_id, status)` or `(user_id, created_at)`.
   - Partition the `tasks` table by user ID range or date for ultra-large datasets.
2. **Caching Layer (Redis)**:
   - Cache frequent queries like user profiles and active task lists.
   - Implement cache invalidation upon task mutations.
3. **Database Read Replicas**:
   - Direct read requests (`GET /api/tasks`) to MySQL read replicas, directing writes (`POST`, `PUT`, `PATCH`) to the primary MySQL master.
4. **Rate Limiting & API Gateway**:
   - Deploy `express-rate-limit` or an API Gateway (Kong, NGINX) to throttle malicious brute-force attempts on `/api/auth/login`.

---

## 8. 25+ Interview Questions and Answers

### Section A: Beginner Questions

#### Q1: What is the difference between `npm start` and `npm run dev` in this project?
**Answer**: `npm start` executes `node src/server.js` directly, which is standard for production environments. `npm run dev` executes `nodemon src/server.js`, which watches for file system changes and automatically restarts the process during local development.

#### Q2: What is the purpose of the `.env` file and why is it excluded from Git?
**Answer**: The `.env` file stores environment-specific configuration and sensitive secrets (database passwords, JWT secret keys, port numbers). It is added to `.gitignore` so secrets are never pushed to public or team version control repositories. `.env.example` is committed as a placeholder template.

#### Q3: What is the difference between HTTP status codes 401 and 403?
**Answer**: `401 Unauthorized` means authentication has failed or is missing—the server does not know who the client is (e.g., missing or invalid JWT). `403 Forbidden` means the client is successfully authenticated, but does not have permission to access the requested resource (e.g., a regular user trying to update a task's status or another user's task).

#### Q4: Why did we separate `src/app.js` and `src/server.js`?
**Answer**: Separation of concerns. `src/app.js` configures Express routes, middleware, and error handling without starting an HTTP listener. `src/server.js` imports `app`, checks database connectivity, and calls `app.listen()`. This allows our automated test suite (`verify-endpoints.js`) to test the app instance directly without port conflicts.

#### Q5: What is the role of `dotenv`?
**Answer**: `dotenv` is a zero-dependency module that loads environment variables from a `.env` file into Node.js's global `process.env` object early in the application bootstrap lifecycle.

---

### Section B: Node.js & Express Questions

#### Q6: How does the Express middleware pipeline work in this project?
**Answer**: Middleware functions execute sequentially in the order they are mounted (`app.use` or route-level arrays). Each middleware receives `req`, `res`, and `next`. It can inspect or modify the request (e.g., `req.user = decoded`), terminate the cycle with a response, or pass control to the next handler by calling `next()`. If `next(error)` is called, Express skips straight to the centralized error middleware.

#### Q7: Why use `async/await` instead of callbacks or raw promises?
**Answer**: `async/await` provides cleaner, readable, synchronous-looking code for asynchronous operations. It eliminates callback hell and simplifies error handling by allowing standard `try/catch` blocks or centralized error propagation to `next(error)`.

#### Q8: How does our centralized error handler intercept errors from asynchronous route handlers?
**Answer**: In our controllers, asynchronous operations are wrapped in `try/catch` blocks where caught errors are forwarded using `next(error)`. Express routes all forwarded errors directly to the 4-argument middleware `(err, req, res, next)` defined in `src/middleware/error.middleware.js`.

#### Q9: What happens if an unhandled JSON syntax error is sent in a POST request?
**Answer**: Express's built-in `express.json()` middleware throws a `SyntaxError`. Our centralized error middleware explicitly detects `err instanceof SyntaxError && err.status === 400` and converts it into a clean, client-friendly `{ success: false, message: 'Malformed JSON payload in request body' }` with status 400.

---

### Section C: Database & MySQL Questions

#### Q10: What is a connection pool and why did we use `mysql2/promise` pooling?
**Answer**: Creating a new TCP connection and authenticating with MySQL for every single incoming HTTP request is computationally expensive and slow. A connection pool maintains an active pool of pre-established database connections (`connectionLimit: 10`) that requests lease and release back, drastically reducing latency and managing database load.

#### Q11: What is a SQL injection vulnerability, and how does this application prevent it?
**Answer**: SQL injection occurs when untrusted user input is directly concatenated into a SQL statement, allowing an attacker to manipulate the query logic. This project prevents SQL injection by strictly using parameterized queries (`pool.execute('SELECT ... WHERE email = ?', [email])`). The MySQL server prepares the query template first, and user parameters are sent separately as pure data values, never executable SQL commands.

#### Q12: Why did we define `ON DELETE CASCADE` on the `tasks.user_id` foreign key?
**Answer**: `ON DELETE CASCADE` is a relational constraint that ensures referential integrity. If a user record is deleted from the `users` table, MySQL automatically removes all tasks belonging to that user in the `tasks` table, preventing orphaned records.

#### Q13: Why are indexes added to `users.email` and `tasks.user_id`?
**Answer**: Indexes create B-Tree lookup structures. Because authentication queries search by `email` on every login, an index prevents slow full-table scans. Similarly, because regular user task lists filter by `tasks.user_id` on every `GET /api/tasks`, indexing `tasks.user_id` guarantees high query performance as task volume scales.

#### Q14: How does our custom migration runner work and why is it idempotent?
**Answer**: `src/migrations/runner.js` creates a `schema_migrations` tracking table in MySQL. Before applying any `.js` migration file, it checks whether that migration name is already recorded in the tracking table. If present, it skips it; if not, it runs the `up()` method and records the execution. This ensures migrations can be executed repeatedly without causing duplicate table errors or corrupting the schema.

---

### Section D: Authentication & JWT Questions

#### Q15: Why is `bcrypt` preferred over algorithms like MD5 or SHA-256 for password hashing?
**Answer**: MD5 and SHA-256 are general-purpose cryptographic hash functions designed to be fast, making them vulnerable to brute-force and dictionary attacks using modern GPUs. `bcrypt` is a slow, computationally expensive hashing algorithm with configurable salt rounds (work factor) and automatic unique salting, making rainbow table and brute-force attacks computationally infeasible.

#### Q16: Why are only `id` and `role` included in the JWT payload?
**Answer**: JWT payloads are Base64Url-encoded, not encrypted. Anyone can decode and inspect the payload. Sensitive information like passwords or private details must never be stored in a JWT. Furthermore, keeping payload size minimal reduces HTTP request header overhead on every network roundtrip.

#### Q17: Where does the client store and transmit the JWT token?
**Answer**: In RESTful APIs, clients store the token (e.g., in Secure HttpOnly cookies or client memory/storage) and send it with every authenticated request in the standard HTTP header:
`Authorization: Bearer <token>`

#### Q18: What is the purpose of `jwt.verify()` in `auth.middleware.js`?
**Answer**: `jwt.verify()` cryptographically checks the token signature using the server's private secret (`process.env.JWT_SECRET`) and checks if the token has expired (`exp` claim). If either check fails, it throws an error and the middleware rejects the request with a `401 Unauthorized` status.

---

### Section E: Authorization & Security Questions

#### Q19: Explain the difference between Role-Based Access Control and Resource Ownership in this project.
**Answer**: RBAC evaluates the user's role against permissions (e.g., only admins can call `PATCH /api/tasks/:id/status`). Resource ownership evaluates whether the specific data record belongs to the caller (e.g., regular user A owns Task 1, so regular user B cannot read or update Task 1). RBAC is checked at the middleware level, while resource ownership is verified at the service level after retrieving the record.

#### Q20: What prevents a user from assigning a task to someone else by submitting `{ "user_id": 999 }` in `POST /api/tasks`?
**Answer**: Two security layers:
1. Joi request validation explicitly sets `.unknown(false)`, rejecting requests containing unknown properties like `user_id` with `400 Bad Request`.
2. Even if passed, the service layer ignores any client-supplied `user_id` and strictly binds `user_id = req.user.id` extracted directly from the verified JWT token.

#### Q21: Why do we return `403 Forbidden` instead of `404 Not Found` when User A tries to view User B's task?
**Answer**: When a task exists but the authenticated user lacks permission to view it, `403 Forbidden` accurately reflects that access is denied due to insufficient authorization. (Note: In some high-security environments where hiding resource existence is required, returning 404 is also valid; in this project, explicit 403 authorization checking was a strict assessment specification).

#### Q22: Why should passwords never be returned in API responses?
**Answer**: Even though passwords are saved as bcrypt hashes, returning hashes in API responses exposes them to network sniffers, client-side logging, caching layers, and unauthorized eyes, enabling offline brute-force attacks. Omission ensures zero leakage.

---

### Section F: Architecture & Project-Specific Questions

#### Q23: Why do we use Joi for validation instead of manual `if (!req.body.title)` checks?
**Answer**: Joi provides declarative, centralized, and consistent schema definitions. It handles type conversions, string trimming, minimum/maximum lengths, email pattern validation, enum values, and generates structured error lists. This avoids repetitive boilerplate checks inside controllers and keeps code clean and maintainable.

#### Q24: How does our `updateTaskStatus` endpoint guarantee only valid statuses are saved?
**Answer**: It enforces validation at two distinct levels:
1. Joi schema validates that `status` must be one of `['Pending', 'In Progress', 'Testing', 'Completed']`, rejecting invalid values with `400 Bad Request`.
2. The MySQL database column is defined as an `ENUM('Pending', 'In Progress', 'Testing', 'Completed')`, enforcing data integrity at the database storage engine level as well.

#### Q25: Why is the seeder script safe to run repeatedly in CI/CD pipelines?
**Answer**: `src/seeders/seed.js` checks if a user with `admin@example.com` or `user@example.com` already exists. If the user exists, it updates their record with the required credentials; if not, it inserts them. This idempotency prevents primary key or unique constraint violations.

#### Q26: If the database is down when starting `src/server.js`, what happens?
**Answer**: In `src/server.js`, `testConnection()` is called before `app.listen()`. If MySQL is unavailable or credentials are wrong, the promise rejects, a descriptive error is logged, and the process exits with `process.exit(1)`. This prevents the application from entering a zombie state where it accepts HTTP requests that immediately fail.
