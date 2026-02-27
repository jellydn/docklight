# Docklight - Justfile

# Default recipe
default:
    @just --list

# Install all dependencies
install:
    cd server && bun install
    cd client && bun install

# Server commands
server-dev:
    cd server && bun run dev

server-build:
    cd server && bun run build

server-typecheck:
    cd server && bun run typecheck

server-lint:
    cd server && bun run lint

server-format:
    cd server && bun run format

server-start:
    cd server && bun start

# Client commands
client-dev:
    cd client && bun run dev

client-build:
    cd client && bun run build

client-typecheck:
    cd client && bun run typecheck

client-lint:
    cd client && bun run lint

client-format:
    cd client && bun run format

client-preview:
    cd client && bun run preview

# Dev Browser commands
browser-install:
    cd .agents/skills/dev-browser && bun install

browser-test:
    cd .agents/skills/dev-browser && bun test

browser-test-watch:
    cd .agents/skills/dev-browser && bun run test:watch

browser-start-server:
    cd .agents/skills/dev-browser && bun run start-server

# Typecheck all
typecheck:
    cd server && bun run typecheck
    cd client && bun run typecheck

# Lint all
lint:
    cd server && bun run lint
    cd client && bun run lint

# Format all
format:
    cd server && bun run format
    cd client && bun run format

# Build all
build:
    cd server && bun run build
    cd client && bun run build
