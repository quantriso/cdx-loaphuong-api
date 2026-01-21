# CDX Loaphuong

DDD-based NestJS application following clean architecture principles.

## Architecture

This project follows:
- **Domain-Driven Design (DDD)** principles
- **CQRS (Command Query Responsibility Segregation)** pattern
- **Hexagonal Architecture (Ports & Adapters)**
- **Clean Architecture** with strict dependency rules

## Tech Stack

- **Framework**: NestJS ^11.0.1 (Fastify adapter)
- **Language**: TypeScript ^5.7.3
- **Database**: PostgreSQL + Drizzle ORM ^0.45.1
- **Caching**: Redis ^5.10.0
- **Package Manager**: Bun 1.1.0
- **Testing**: Jest ^30.0.0
- **Logging**: Pino ^10.1.0
- **Tracing**: OpenTelemetry

## Project Structure

```
src/
├── libs/                    # Shared libraries
│   ├── core/               # Pure abstractions (@core)
│   └── shared/             # Infrastructure implementations (@shared)
└── modules/                # Feature modules
    └── {module}/
        ├── domain/         # Business logic
        ├── application/    # Use cases (Commands/Queries)
        └── infrastructure/ # Technical adapters
```

## Getting Started

### Prerequisites

- Bun 1.1.0+
- PostgreSQL
- Redis

### Installation

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env

# Run database migrations
bun run db:migrate

# Start development server
bun run start:dev
```

## Development

```bash
# Run tests
bun run test

# Run tests with coverage
bun run test:cov

# Lint code
bun run lint

# Format code
bun run format
```

## Documentation

Architecture documentation is available in the `_bmad/architecture/` folder (not committed to git).

## License

UNLICENSED
