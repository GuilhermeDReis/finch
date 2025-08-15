# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Finch is a React-based personal finance management application built with TypeScript, Vite, and Supabase. It allows users to track transactions, import data from CSV files and credit card statements, create financial dashboards, and integrate with the Belvo API for bank connectivity.

## Essential Commands

### Development
```bash
# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Supabase (Backend)
```bash
# Start local Supabase (from supabase directory)
supabase start

# Stop local Supabase
supabase stop

# Generate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Package Management
The project supports both npm (package-lock.json) and Bun (bun.lockb). Use npm for consistency.

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database + Auth + Edge Functions)
- **State Management**: React Context + TanStack Query for server state
- **Charts**: Recharts for data visualization
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @dnd-kit for reorderable components

### Project Structure

#### Core Application Structure
```
src/
├── App.tsx                 # Main app with routing and context providers
├── main.tsx               # Application entry point
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui base components
│   ├── Layout.tsx        # Main app layout with sidebar
│   ├── AppSidebar.tsx    # Navigation sidebar
│   └── ...               # Feature-specific components
├── pages/                # Route-level components
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── integrations/         # External service integrations
│   └── supabase/         # Supabase client and types
├── services/             # Business logic and API services
├── types/                # TypeScript type definitions
├── lib/                  # Utility libraries
└── utils/                # Helper functions
```

#### Key Context Providers (App.tsx hierarchy)
1. **QueryClientProvider**: TanStack Query for server state management
2. **ThemeProvider**: Dark/light theme management (next-themes)
3. **AuthProvider**: User authentication state
4. **DateProvider**: Global date selection state (month/year)
5. **ChartProvider**: Financial chart configurations and data
6. **TooltipProvider**: UI tooltip management

### Database Architecture

The application uses Supabase with multiple related tables:
- **transactions**: User's financial transactions (debit/income/expense)
- **transaction_credit**: Credit card transactions (separate table)
- **categories/subcategories**: Transaction categorization system
- **user_charts**: Custom dashboard chart configurations
- **credit_cards**: Credit card information and bills

### Key Features & Components

#### 1. Transaction Management (`/transactions`)
- **TransactionManagement.tsx**: Main transaction management page
- **TransactionTable.tsx**: Paginated table with filtering
- **TransactionModal.tsx**: Add/edit transaction form
- **TransactionFilters.tsx**: Advanced filtering options

#### 2. Data Import (`/import`)
- **ImportExtract.tsx**: CSV/file import functionality
- **TransactionImportTable.tsx**: Review and categorize imported data
- **CSVUploader.tsx**: Drag & drop file upload component
- AI-powered transaction categorization with confidence scoring

#### 3. Dashboard & Charts (`/dashboard`, `/`)
- **DashboardPage.tsx**: Interactive financial charts and KPIs
- **ChartCard.tsx**: Individual chart components
- **ChartProvider**: Manages chart configurations and data
- Support for line, bar, and pie charts with customizable time periods

#### 4. Credit Card Management (`/credit-cards`)
- **CreditCards.tsx**: Credit card overview and management
- **CreditCardBill.tsx**: Individual credit card bill details
- Separate transaction tracking for credit card expenses

#### 5. Belvo Integration (`/belvo-test`)
- **BelvoTestPage.tsx**: Banking API integration testing
- **belvo/**: Components for bank connection and data fetching
- Real-time bank account and transaction synchronization

### File Import & Processing

The application supports multiple file layouts for transaction import:
- **Standard CSV**: Basic transaction format
- **Credit Card Statements**: Specialized parsing for CC bills  
- **Bank Statements**: Various bank-specific formats

Key processing features:
- Automatic duplicate detection and prevention
- AI-powered transaction categorization using external services
- CSV layout detection and validation
- Real-time import progress tracking

### Routing Structure

All routes except `/auth` are protected and require authentication:
- `/` - Home/Dashboard
- `/dashboard` - Financial dashboard with charts  
- `/transactions` - Transaction management
- `/import` - Data import functionality
- `/credit-cards` - Credit card management
- `/credit-cards/:cardId/bill` - Individual credit card bills
- `/profile` - User profile settings
- `/settings` - Application settings
- `/belvo-test` - Banking integration testing

### Development Patterns

#### Component Organization
- Use functional components with hooks
- Implement proper TypeScript types for all props and data
- Follow shadcn/ui component patterns for consistency
- Implement responsive design (mobile-first with Tailwind)

#### State Management
- Use React Context for global state (auth, theme, date selection)
- Use TanStack Query for server state management
- Local state with useState/useReducer for component-specific data

#### Error Handling
- Comprehensive error logging with custom logger utility
- User-friendly error messages via toast notifications  
- Graceful fallbacks for failed API calls

#### Performance Optimizations
- Lazy loading for route components (React.lazy)
- Code splitting with Vite build configuration
- Optimized bundle chunks for better caching
- Virtual pagination for large transaction lists

### Configuration Files

- **vite.config.ts**: Development server (port 8080) and build optimization
- **tailwind.config.ts**: Custom design system with CSS variables
- **components.json**: shadcn/ui configuration
- **supabase/config.toml**: Local Supabase development settings
- **eslint.config.js**: ESLint rules with TypeScript support

### Development Guidelines

#### Path Aliases
Use the configured `@/` alias for all imports:
```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
```

#### Database Operations
Always use the typed Supabase client and handle errors appropriately:
```typescript
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.id);

if (error) {
  logger.error('Database error', { error });
  // Handle error appropriately
}
```

#### Component Props
Define proper TypeScript interfaces for all component props:
```typescript
interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  loading?: boolean;
}
```

#### Form Handling
Use React Hook Form with Zod validation for all forms:
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ }
});
```

### Integration Points

#### Supabase
- Authentication via `@supabase/supabase-js`
- Real-time subscriptions for live data updates
- Edge Functions for backend logic (gemini-categorize-transactions, belvo-token)
- Row Level Security (RLS) for data protection

#### External APIs
- **Belvo**: Banking integration for transaction synchronization
- **AI Services**: Transaction categorization and duplicate detection
- **File Processing**: CSV parsing and validation services

### Common Development Tasks

#### Adding New Transaction Categories
1. Insert into `categories` table via Supabase admin
2. Update type definitions if needed
3. Test categorization in import flow

#### Creating New Chart Types
1. Extend `ChartConfig` type in chart types
2. Add chart rendering logic in appropriate chart component
3. Update ChartProvider to handle new configuration options

#### Adding New File Import Formats  
1. Extend file layout detection in `fileLayoutService.ts`
2. Add parsing logic for the new format
3. Update validation rules and error handling

This architecture supports a scalable personal finance application with comprehensive transaction management, intelligent data import, and flexible visualization capabilities.
