# Inspect360 - AI-Powered Building Inspection Platform

## Overview
Inspect360 is a PWA-first AI-powered building inspection platform for Build-to-Rent (BTR) operations. It aims to streamline property management and enhance operational efficiency through features like role-based access, offline mobile inspections, AI-driven photo analysis and comparison reporting, compliance document tracking with expiry alerts, a dedicated tenant portal, internal maintenance tracking, block-level asset inventory filtering, and a comprehensive subscription system with multi-currency support and credit-based inspections. The platform also includes an AI chatbot with a knowledge base for enhanced user support.

## User Preferences
- Prioritize PWA-first mobile experience
- Inspect360 branded color scheme: Bright Cyan (#00D5CC / HSL 174 100% 42%) primary, Teal (#3B7A8C / HSL 193 40% 38%) accents
- Logo: attached_assets/Inspect360 Logo_1761302629835.png (bright cyan magnifying glass with teal house icon)
- Clean, accessible enterprise UI with generous white space
- Role-based feature access
- Offline support for field inspections

## System Architecture
The platform is built on a robust web architecture with a PWA-first approach, emphasizing a modern, clean design system and branded color palette.

### UI/UX Decisions
- **Modern Clean Design System**: Employs Inter font, clean cards, soft shadows, subtle hover effects, and skeleton loaders with cyan shimmer.
- **Color Scheme**: Bright Cyan for primary CTAs, Teal for accents/links, with white backgrounds and warm gray neutrals.
- **Branding**: Inspect360 logo is prominently displayed.
- **Layout**: Features a responsive left sidebar navigation and a top bar.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, Wouter, TanStack Query, Shadcn UI, Tailwind CSS, Uppy.
- **Backend**: Express.js, PostgreSQL with Drizzle ORM, Passport.js for authentication.
- **Authentication**: Custom username/password authentication with session management, case-insensitive email handling, duplicate account detection, and streamlined registration flow. All self-registrations are automatically assigned the "owner" role and receive an auto-provisioned organization with welcome credits, default templates, and sample data.
- **Object Storage**: Google Cloud Storage for media files with public ACLs for organization-wide viewing.
- **Database Schema**: Comprehensive schema including users, organizations, properties, blocks, inspections, compliance documents, maintenance requests, asset inventory, contacts, tenant assignments, message templates, and a tagging system.
- **Role-Based Access**: Granular control for various user roles with comprehensive access controls:
  - **Inspection Clerks**: Can only view and complete inspections assigned to them (filtered by `inspectorId`)
  - **Owners/Compliance**: Can view and manage all inspections in their organization
  - **Multi-layer Security**: List filtering + individual inspection authorization checks prevent unauthorized access
- **Credit System**: Stripe-integrated credit-based subscription for AI features with multi-currency support and Eco-Admin pricing management.
- **Eco Admin Dashboard**: Comprehensive admin interface for managing subscription tiers, pricing, and credit bundles:
  - **Subscription Plans Management**: Create and manage subscription plans (Starter £49/50 credits, Professional £149/200 credits, Enterprise £349/500 credits, Enterprise+ custom/2000+ credits) with GBP base pricing
  - **Credit Bundles**: Configure add-on credit packages with multi-currency pricing (GBP, USD, AED): 100 credits (£4.00/credit), 250 credits (£3.00/credit), 500 credits (£2.00/credit), 1000 credits (£1.50/credit)
  - **Country Pricing Overrides**: Set region-specific pricing for plans using country codes (ISO 3166-1 alpha-2), enabling localized pricing in multiple currencies
  - **Database Schema**: plans table for base subscription plans, credit_bundles table for add-on packages, country_pricing_overrides table for region-specific pricing
  - **API Security**: All Eco Admin routes (/api/admin/plans, /api/admin/bundles, /api/admin/country-pricing) enforce admin-only access and include Zod validation for data integrity
  - **Multi-Currency Support**: Full support for GBP, USD, and AED across all pricing entities
  - **Frontend UI**: Tab-based interface (Plans, Credit Bundles, Multi-Currency Pricing) with comprehensive CRUD operations, accessible at /admin/eco-admin
- **AI Features**: Integration with OpenAI GPT-5 Vision for photo analysis, comparison reports, maintenance triage, and an AI chatbot with knowledge base integration. Features include:
  - **Context-Aware Photo Analysis**: AI focuses specifically on the inspection point title (e.g., when analyzing "Doors and Handles", the AI ignores other room elements and concentrates only on doors/handles in the photo)
  - **Check-In Photo Reference**: During Check-Out inspections, the system displays corresponding Check-In photos for each field to help inventory clerks match camera angles for accurate comparisons
  - **Intelligent Chatbot**: GPT-5 powered assistant with knowledge base integration for enhanced user support
  - Utilizes Replit AI Integrations
- **PWA**: `manifest.json` and service worker for offline capabilities, caching, and install prompts.
- **Inspection Templates System**: JSON-based templates with a flexible editor, versioning, snapshots, and a visual Template Builder UI. Includes default BTR templates for new organizations.
- **Sample Data on Registration**: Automatic provision of sample data for new organizations.
- **Inspection Capture Workflow**: Comprehensive field inspection workflow with optimistic updates, review pages, status management, native camera capture, and quick actions via a Floating Action Button (FAB).
- **Offline Queue System**: LocalStorage-based offline sync with auto-reconnection and status indicators for inspection entries, assets, and maintenance requests.
- **AI-Powered Tenant Maintenance Requests**: Multi-step tenant portal with AI-powered fix suggestions and image upload.
- **Condition & Cleanliness Ratings**: Configurable per-field ratings in Template Builder.
- **Signature Capture**: Interactive signature pad for inspection sign-offs.
- **Inspection Reports**: Generates formatted HTML reports and server-side PDFs with professional cover pages using Puppeteer.
- **Annual Compliance Calendar**: Visual compliance tracking grid.
- **Block-Level Filtering**: Filtering of properties, asset inventory, and compliance documents.
- **Block Tenant Management**: Comprehensive tenant occupancy tracking and roster management.
- **API Security**: Zod validation and multi-tenant isolation.
- **Tenant Broadcast Messaging**: Block-level communication system with email templates.
- **Inline Tenant Creation**: Property-level tenant assignment with integrated user creation.
- **Collaborative Comparison Reports**: End-to-end check-out inspection comparison with AI analysis, asset-based depreciation, async discussion, electronic signatures, and support for vacant units. Includes "Mark for Review" functionality.
- **Fixflo Integration**: Two-way integration with Fixflo maintenance management system.
- **Auto-Template Selection**: Automatic template selection based on inspection type.
- **Consolidated Maintenance Interface**: Unified page for "Requests" and "Work Orders" with inline creation from inspection reports.
- **Flexible Inspection Status Management**: Editable inspection status dropdown without progress restrictions.
- **Team-Based Work Order Management**: System for work order assignment, notifications, and analytics, featuring atomic team creation/updates, distribution email lists, and category-based routing. Contractor email notifications are supported.
- **AI Chatbot with Knowledge Base**: Comprehensive intelligent help system featuring:
  - **Knowledge Base Management** (Eco-Admin only): Upload and manage PDF, DOCX, and TXT documents with automatic text extraction via pdf-parse and mammoth libraries. Document search and chunking for AI context injection.
  - **AI Chatbot** (all users): Floating button provides universal access to GPT-5 powered assistant. Features conversation history, auto-titled conversations, message persistence, and knowledge base-enhanced responses.
  - **Database Schema**: knowledge_base_documents table for document storage with extracted text; chat_conversations and chat_messages tables for conversation management with role-based messages and source document tracking.
  - **OpenAI Integration**: Uses GPT-5 with proper parameters (max_completion_tokens, no temperature) for main responses and GPT-5-mini for conversation title generation.
  - **Frontend Components**: AIChatbot component with conversation history drawer, message threading, loading states, and error handling. Knowledge Base management UI with Uppy-based document upload.
  - **Session-based Security**: All chat and KB routes use session authentication with multi-tenant isolation.
- **Tag-Based Filtering System**: Comprehensive tagging and filtering system for organizing entities:
  - **Reusable TagFilter Component**: Multi-select tag filtering interface with organization-wide tag management
  - **Entity Tagging**: Tags can be applied to Blocks, Properties, and Tenant Assignments for flexible organization
  - **Combined Filtering**: Search by text AND filter by tags (entities must have ALL selected tags)
  - **Visual Tag Display**: Colored tag badges displayed on entity cards for quick identification
  - **Database Schema**: Tags table with color support; junction tables (block_tags, property_tags, tenant_assignment_tags) for many-to-many relationships
  - **API Endpoints**: RESTful endpoints for managing tags on entities (/api/{entity}/{id}/tags)
  - **React Query Integration**: Query keys include entity IDs for automatic cache invalidation when entities change
  - **Known Limitation**: Current implementation uses N+1 queries (one per entity) for tag fetching; future optimization should implement batch endpoints for better scalability
- **Professional BTR Reports System**: Comprehensive reporting suite for data analysis and stakeholder communication:
  - **Reports Hub**: Central landing page at `/reports` with navigation cards for Inspections, Blocks, Properties, Tenants, and Inventory reports (Owner/Compliance role access only)
  - **Inspections Report** (Fully Functional): Multi-criteria filtering (status, type, property, block, date range), summary statistics (total/completed/in-progress/scheduled counts), tabular display, and PDF export with branded INSPECT360 cover page using Puppeteer
  - **Blocks Report** (Fully Functional): Block-level occupancy metrics including total units, occupied/vacant counts, occupancy rates, searchable table view, and PDF export with branded cover page
  - **Advanced Filtering**: Implemented reports include customizable filters with clear-all functionality and real-time data updates via React Query
  - **PDF Generation**: Server-side PDF creation using Puppeteer with branded templates (INSPECT360 logo, cyan/teal gradient covers, professional layouts, summary statistics)
  - **Database Integration**: Reports leverage existing storage layer methods (getInspectionsByOrganization, getBlocksByOrganization, etc.) with client-side filtering
  - **Backend Security**: All PDF endpoints (/api/reports/inspections/pdf, /api/reports/blocks/pdf) enforce multi-tenant isolation and session authentication
  - **Future Roadmap**: Properties, Tenants, and Inventory reports marked as "Coming Soon" in the Reports Hub; to be implemented following the established pattern
- **Tenant Portal**: Dedicated portal for tenants with PWA-first mobile experience:
  - **Separate Authentication**: Independent login system at `/tenant/login` for tenant users (role='tenant')
  - **Tenant Home Dashboard**: Displays property details, block information, tenancy information (lease dates, rent, deposit), and quick action cards
  - **AI Preventative Maintenance Chatbot**: Multi-step AI assistance system for maintenance issues:
    - Image upload support with GPT-5 Vision analysis
    - AI provides practical troubleshooting steps and suggested fixes
    - Conversation history with auto-generated titles
    - Option to escalate to formal maintenance request if AI suggestions don't resolve the issue
    - Chat history visible to property managers when maintenance request is created
  - **Maintenance Requests View**: Tenants can view all their submitted maintenance requests with status tracking, AI suggested fixes, and photos
  - **Database Schema**: tenant_maintenance_chats table for chat conversations; tenant_maintenance_chat_messages table for messages with AI suggestions
  - **No Sidebar Layout**: Clean, simplified interface tailored for tenant experience without administrative navigation
  - **Backend Routes**: Comprehensive API at `/api/tenant/*` for login, tenancy data, chat management, and maintenance request creation

## External Dependencies
- **PostgreSQL (Neon)**: Primary database.
- **OpenAI Vision API**: AI photo analysis and comparison reports.
- **Stripe**: Payment processing for credits.
- **Google Cloud Storage**: Object storage for media.
- **Resend**: Email service.
- **Passport.js**: Authentication middleware.
- **Drizzle ORM**: TypeScript ORM.
- **Vite**: Frontend build tool.
- **Wouter**: Frontend routing library.
- **TanStack Query**: Data fetching and caching.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Uppy**: File upload library.
- **Puppeteer**: Headless browser for server-side PDF generation.