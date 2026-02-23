# LedgerFlow - Core Banking & E-Wallet API

LedgerFlow is a high-performance, enterprise-grade digital wallet RESTful API built with NestJS and Fastify. It is designed to handle secure financial transactions with strict data integrity, effectively preventing race conditions and double-spending.

## Architecture & Tech Stack

- Framework: NestJS (Fastify Adapter)
- Language: TypeScript
- Database: PostgreSQL
- ORM: Prisma v7
- Caching & Session Management: Redis
- Security: Argon2 (Password Hashing), JWT (Access & Refresh Tokens)
- Testing: Jest (Unit Testing with Mocking)
- Containerization: Docker & Docker Compose
- API Documentation: Swagger UI

## Key Features

1. Optimistic Concurrency Control (OCC)
   Implemented version-based locking on the wallet table to prevent race conditions. High-volume concurrent requests to modify the same wallet balance are safely queued or rejected to prevent phantom money creation.

2. Atomic Transactions
   Peer-to-Peer (P2P) transfers are wrapped in database transactions. Deducting the sender, crediting the receiver, and recording both ledger entries execute as a single atomic unit (All-or-Nothing execution).

3. Two-Tier Authentication System
   Utilizes short-lived, stateless Access Tokens (JWT) for performance, paired with long-lived Refresh Tokens stored securely in Redis. This allows for immediate session revocation (Kill-Switch) in case of compromised accounts.

4. Containerized Infrastructure
   Fully isolated and reproducible development and production environments using multi-stage Docker builds.

## Prerequisites

Before running this project, ensure you have the following installed on your system:

- Docker and Docker Compose
- Git

## Getting Started

1. Clone the repository

   ```bash
   git clone <https://github.com/awaluddin-dev/ledger-flow>
   cd ledger-flow
   ```

2. Configure Environment Variables
   Create a .env file in the root directory and configure the following variables:

   ```bash
   DATABASE_URL="postgresql://postgres:1234passwordkuat@postgres:5432/ledger_flow?schema=learning"
   REDIS_URL="redis://redis:6379"
   JWT_SECRET="your_secure_jwt_secret"
   JWT_REFRESH_SECRET="your_secure_refresh_secret"
   ```

3. Build and Run via Docker
   The application, along with PostgreSQL and Redis, can be started with a single command:

   ```bash
     docker-compose up -d --build
   ```

This command will automatically provision the database, run Prisma migrations, and start the Fastify server.

API Documentation
Once the container is running, the interactive API documentation is available at:

<http://localhost:3000/api/docs>

You can use the Swagger UI to test the endpoints (Registration, Login, TopUp, Transfer, and History).

Running Tests
To run the automated unit tests locally (Node.js and pnpm required on the host machine):

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test
```

License
This project is licensed under the MIT License.
