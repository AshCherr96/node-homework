# Task List REST API

This project is a Node.js and Express REST API for managing user accounts and personal tasks. It uses PostgreSQL with Prisma for data storage and provides a complete task-management workflow with registration, login, and authenticated CRUD operations.

## Features

- Register and log in users with validated input and hashed passwords.
- Create, read, update, and delete tasks belonging to the authenticated user.
- Mark tasks complete and assign task priorities.
- Paginate, filter, and sort task results.
- Provide manager-only analytics endpoints through role-based access control.
- Store authentication in signed, HTTP-only JWT cookies.
- Protect state-changing requests with CSRF tokens.
- Use Helmet, rate limiting, XSS sanitization, Joi validation, and centralized error handling.

## Main API Routes

User routes are mounted at `/api/users`:

- `POST /register` creates a user account and welcome tasks.
- `POST /logon` authenticates a user and sets the JWT cookie.
- `POST /logoff` ends the authenticated session.

Task routes are mounted at `/api/tasks` and require authentication:

- `POST /` creates a task.
- `GET /` lists the authenticated user's tasks.
- `GET /:id` reads one task owned by the authenticated user.
- `PATCH /:id` updates a task.
- `DELETE /:id` deletes a task.

Analytics routes are mounted at `/api/analytics` and require the `manager` role:

- `GET /users` returns user analytics.
- `GET /users/:id` returns analytics for one user.
- `GET /tasks/search` searches tasks.

## Technology

Node.js, Express, Prisma, PostgreSQL, JSON Web Tokens, Joi, Jest, and Supertest.

## Running the Project

Install dependencies and configure the required environment variables, including `DATABASE_URL` and `JWT_SECRET`. Then run:

```bash
npm start
```

For development with automatic restart:

```bash
npm run dev
```

Run the automated tests with:

```bash
npm test
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
