# WNF Tech Stack Overview

## Core Technologies

### Frontend Framework
- **React**: A JavaScript library for building user interfaces
- **TypeScript**: Adds static typing to JavaScript for better developer experience and code quality
- **Vite**: Modern build tool that provides faster development experience

### Styling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Daisy UI**: Component library built on top of Tailwind CSS that provides pre-designed UI components

### Backend
- **Supabase**: Open-source Firebase alternative providing:
  - Authentication services
  - PostgreSQL database
  - Realtime subscriptions
  - Storage solutions
  - Edge Functions

### State Management & Data Fetching
- **TanStack Query (React Query)**: For server state management and data fetching
  - Configured with 5-minute stale time and 30-minute cache time

### UI Enhancements
- **Framer Motion**: Library for creating animations and transitions
- **React Hot Toast**: Lightweight notification library
- **Radix UI**: Unstyled, accessible components for building high-quality UI
  - Used for tooltips and other interactive elements

### Analytics
- **Vercel Analytics**: Provides insights into user behavior and application performance
  - Automatically tracks page views
  - Monitors web vitals and performance metrics
  - Implementation details in [VercelAnalyticsIntegration.md](./VercelAnalyticsIntegration.md)

## Development Tools

### Code Quality
- **ESLint**: Static code analysis tool for identifying problematic patterns
- **TypeScript**: Provides type checking during development

### Package Management
- **npm**: Node package manager for dependency management

## Deployment
- **Vercel**: Platform for frontend deployment with built-in CI/CD

## Project Structure Guidelines
- Modular code organization with small, focused files
- Component-based architecture
- Reusable UI components in `src/components/ui`
- Custom hooks in `src/hooks`
- Page components in `src/pages`
- Context providers in `src/context`
- Utility functions in `src/utils`

## Documentation
- Comprehensive documentation in `docs` directory
- Component documentation in `docs/components`
- Feature documentation in root of `docs`
- Database documentation in `docs/database`

## Best Practices
- Files should not exceed 200 lines of code
- Components should be broken down into smaller, reusable parts
- Extensive comments for maintainability
- UK spelling and grammar in all code and documentation
- Follow existing naming conventions and directory structures
- Use tooltips via Radix UI for additional context
- Create reusable components where possible
