# Kels-POS: Project Instructions

## Project Overview
Kels-POS is an advanced, omnichannel Point of Sale (POS) and headless loyalty system designed for "Always On" reliability. It utilizes an offline-first architecture to ensure business continuity during internet outages.

### Core Technologies
- **Framework**: Next.js 16.2.9 (App Router)
- **Library**: React 19.2.4
- **Local Storage**: Dexie.js (IndexedDB) for client-side data persistence.
- **Cloud Database**: MariaDB/MySQL via Prisma ORM.
- **Styling**: Tailwind CSS & Lucide React icons.
- **Offline Support**: `next-pwa` for service workers and application shell caching.

## Architecture & Data Flow

### 1. Offline-First Synchronization
All transactions (Orders, Customers, Products) follow a **Local-First** pattern:
- **Write**: Data is first written to the local IndexedDB using Dexie (`src/lib/db.ts`).
- **Queue**: A record is added to the `syncQueue` table.
- **Push**: The `SyncManager` (`src/lib/sync.ts`) monitors `navigator.onLine` and automatically flushes the queue to the backend via `/api/sync`.

### 2. Database Synchronization
The local IndexedDB schema (`src/lib/db.ts`) must remain conceptually aligned with the Prisma Cloud schema (`prisma/schema.prisma`).
- **Products**: Support for both Products (fixed) and Services (variable/custom units).
- **Orders**: Support for `PENDING`, `HELD`, `COMPLETED`, and `REFUNDED` statuses.
- **Customers**: Unified profiles storing phone numbers and headless loyalty IDs for point accrual.

## Key Commands

### Development
```bash
npm run dev
```
Starts the development server. Note: Webpack is currently required via the `--webpack` flag in the project scripts.

### Production Build
```bash
npm run build
```

### Linting & Quality
```bash
npm run lint
```

## Development Conventions

- **State Management**: Use custom hooks (e.g., `useCart`, `useOnlineStatus`) for complex logic and `dexie-react-hooks` (`useLiveQuery`) for real-time database reactivity.
- **UI Components**: Follow the modular structure in `src/components/`. Components should be responsive and handle loading/empty states gracefully.
- **Sync Logic**: Never perform direct cloud writes from the UI. Always use `addToSyncQueue` to ensure offline resilience.
- **Type Safety**: Adhere strictly to the TypeScript interfaces defined in `src/lib/db.ts`.

## Source Control & Validation

- **Testing Requirement**: Every change, especially new functions and features, must undergo a **full system test** before being committed. Ensure the system works smoothly without errors across all core workflows (Catalog, Cart, Customer Lookup, Sync).
- **Commit & Push**: Once validated, all changes must be committed and pushed to the repository to maintain a synchronized and up-to-date codebase. Use descriptive commit messages that reflect the specific features or fixes implemented.
- **Verification Commands**: Always run `npm run lint` and `npm run build` to verify structural integrity and catch potential runtime issues before pushing.

## Project Structure
- `src/app/pos/`: Core POS interface and checkout logic.
- `src/app/reports/`: Business insights and daily summary dashboard.
- `src/lib/db.ts`: Local database configuration and schema.
- `src/lib/sync.ts`: Background synchronization engine.
- `src/components/POS/Scanner/`: Barcode scanning logic (Hardware HID & Simulated).
- `src/components/CustomerSelector/`: Loyalty lookup and customer creation.

---
*Note: This project uses a futuristic version of Next.js (16.2.9). Refer to `node_modules/next/dist/docs/` for specific API differences.*
