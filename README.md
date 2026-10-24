# DubaiBiz AI
### AI-Powered CRM & Business Management Platform

DubaiBiz AI is a full-stack business management application designed to help organizations manage customers, track sales leads, monitor business performance, and interact with an AI-powered assistant.

The project demonstrates full-stack development, authentication and authorization, relational database integration, REST API development, and AI service integration.

## Key Features

- **Authentication:** User registration, email OTP verification, login, logout, and password management.
- **Role-Based Access Control:** Separate access permissions for administrators and regular users.
- **Customer Management:** Create, view, update, and delete customer records.
- **Lead Management:** Manage sales leads and track their progress through pipeline stages.
- **Analytics Dashboard:** View customer counts, lead statistics, conversion rates, and business insights.
- **AI Assistant:** Interact with an AI-powered assistant for CRM-related questions.
- **Account Settings:** Update profile information and change passwords.
- **Admin Dashboard:** View administrative statistics and user information.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| AI Service | Python, FastAPI |
| Authentication | JWT, bcrypt, Email OTP |
| Development Tools | Git, GitHub, VS Code |

## System Architecture

The React frontend communicates with the Express REST API for authentication and CRM operations. The backend uses Prisma ORM to access PostgreSQL. A separate Python FastAPI service supports AI-related functionality.

## Application Screenshots

Add screenshots of the following pages to an `assets/screenshots` directory:

- Dashboard
- Customer Management
- Lead Management
- Analytics
- AI Assistant
- Admin Dashboard

## Local Installation

### Prerequisites

- Node.js and npm
- PostgreSQL
- Python 3
- Git

### Clone the Repository

```bash
git clone https://github.com/MLwithManali/DubaiBiz-AI.git
cd DubaiBiz-AI
```

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

```bash
cd server
npm install
```

Configure the backend environment variables, including the database connection, JWT secret, and email service credentials, using your local environment configuration.

Run the required Prisma setup and database migrations for your environment.

```bash
npm run dev
```

### AI Service

```bash
cd ai-service
python -m venv .venv
```

Activate the virtual environment, install the project's Python dependencies, configure any required AI service credentials, and start FastAPI using the application's entry point.

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Email OTP verification
- Protected API routes
- Role-based authorization
- Password-strength validation
- Authentication rate limiting

## Project Purpose

DubaiBiz AI was developed as a portfolio project to demonstrate practical experience building an integrated business application with modern frontend, backend, database, and AI technologies.

## Author

**Manali Gandhi**

MSc Artificial Intelligence — Heriot-Watt University Dubai

[GitHub Profile](https://github.com/MLwithManali)

## Project Status

Core development completed. Local testing performed. Deployment and further improvements are planned.
