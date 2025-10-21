# Inspect360 - AI-Powered Building Inspection Platform

## Overview
Inspect360 is a PWA-first building inspection platform for Build-to-Rent (BTR) operations. It offers role-based access for Owner Operators, Inventory Clerks, Compliance Officers, and Tenants. Key capabilities include offline mobile inspections, AI-powered photo analysis and comparison reporting using OpenAI Vision API, compliance document tracking with expiry alerts, a tenant portal, internal maintenance tracking, and an inspection credit system powered by Stripe. The platform aims to streamline property management and enhance operational efficiency for BTR businesses.

## User Preferences
- Prioritize PWA-first mobile experience
- Navy/Green/Deep Blue brand color scheme
- Clean, accessible enterprise UI
- Role-based feature access
- Offline support for field inspections

## System Architecture
The platform follows a PWA-first approach with a robust web architecture.

### UI/UX Decisions
- **Modern Design System (October 2025)**:
  - **Typography**: Inter font system with bold headers (text-4xl/5xl) and clear hierarchy
  - **Glassmorphic Cards**: Backdrop-blur effects with semi-transparent backgrounds for depth
  - **Shadows**: Refined shadow system (8px-32px blur, 0.04-0.60 opacity) for subtle elevation
  - **Border Radius**: Modern 1rem (16px) for cards, 0.75rem (12px) for smaller elements
  - **Transitions**: Smooth 150-250ms transitions for all interactive elements
  - **Spacing**: Generous spacing with p-8/p-12 containers and gap-6/gap-8 grids
  - **Visual Feedback**: Color-coded icons with background circles, hover lift effects
  - **Loading States**: Modern animated spinners and skeleton loaders with shimmer
- **Color Scheme**: Navy (#003764) for primary surfaces, Fresh Green (#59B677) for accents/CTAs, and Deep Blue (#000092) for secondary accents/badges.
- **Components**: Glassmorphic cards with backdrop blur, modern icon badges, elevated hover states.
- **Layout**: Left sidebar navigation with role-aware menu items, top bar with toggle and logout, responsive grid layout with generous spacing.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, Wouter for routing, TanStack Query for data fetching, Shadcn UI components, Tailwind CSS for styling, and Uppy for file uploads.
- **Backend**: Express.js, PostgreSQL (Neon) for the database, Drizzle ORM, Passport.js with Local Strategy for custom username/password authentication, and Express-session for session management.
- **Authentication**: Custom username/password authentication with Passport.js, utilizing `req.user.id` for user identification across API routes.
- **Object Storage**: Google Cloud Storage for inspection photos and compliance documents with ACL policies.
- **Database Schema**: Core tables include `users` (with roles: owner, clerk, compliance, tenant, contractor), `organizations`, `properties`, `units`, `blocks`, `inspections`, `inspection_items`, `compliance_documents`, `maintenance_requests`, `work_orders`, `work_logs`, `comparison_reports`, `credit_transactions`, and `asset_inventory`.
- **Role-Based Access**: Granular access control for Owner Operators (full access), Inventory Clerks (inspections, photo uploads), Compliance Officers (document management, expiry tracking), Tenants (unit-specific reports, maintenance requests), and Contractors (assigned work orders). Secure unit filtering ensures tenants only access their own units.
- **Credit System**: AI photo analysis (1 credit), AI comparison reports (2 credits). Credits are purchased via Stripe, and organizations receive 5 free credits initially.
- **AI Features**:
    - **Photo Analysis**: Powered by OpenAI GPT-5 Vision to analyze room/item conditions, generate assessments, and identify issues.
    - **Comparison Reports**: Compares check-in vs. check-out inspections, highlights changes, and generates AI summaries for deposit decisions.
- **PWA**: Includes a `manifest.json` for app metadata and a service worker for offline capabilities and caching.
- **Performance**: Optimized database queries (e.g., `getBlocksWithStats` uses batched queries) and Zod validation for robust API error handling.

### Feature Specifications
- **Core Modules**: Properties, Units, Inspections, Compliance, Maintenance, Credit Management, Asset Inventory.
- **Asset Inventory**: Track physical assets and equipment across properties and blocks with photos, supplier information, purchase dates, condition tracking (excellent, good, fair, poor, needs_replacement), and expected lifespan. Supports filtering by property or block, full CRUD operations, and image uploads via Uppy.
- **Dashboards**: Role-specific dashboards with KPIs (properties, units, inspections, credits, occupancy, compliance status).
- **Tenant Portal**: Secure access to unit-specific reports and maintenance request submission.
- **Team Management**: Owner-controlled user and role management.
- **Organization Onboarding**: Streamlined setup for new organizations.
- **Search and Filters**: Functionality to search and filter properties and blocks by name/address.
- **Block-Property Relationship**: Properties can be assigned to blocks, and block details include associated properties with metrics.

## External Dependencies
- **PostgreSQL (Neon)**: Main database for all application data.
- **OpenAI Vision API (via Replit AI Integrations)**: For AI-powered photo analysis and comparison report generation.
- **Stripe**: Payment gateway for credit purchases and webhook handling.
- **Google Cloud Storage**: Object storage for inspection photos and compliance documents.
- **Passport.js**: Authentication middleware.
- **Drizzle ORM**: TypeScript ORM for database interactions.
- **Vite**: Frontend build tool.
- **Wouter**: Frontend routing library.
- **TanStack Query**: Data fetching library.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Uppy**: File upload library.