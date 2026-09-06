# SENTINEL Web Application Walkthrough

## Overview
The SENTINEL application is a complete, mobile-first responsive web application built for industrial H₂S dosimeter management. It enables organizations to issue, track, and digitally record readings from passive colorimetric dosimeter strips using computer vision and machine learning proxies.

The application has been successfully built, and the codebase passes all TypeScript compiler checks.

## Key Features Implemented

### 1. Robust Authentication & Roles
- **Multi-tenant Role Support**: `admin`, `manager`, and `worker` roles.
- **Middleware Protected Routes**: The Next.js `proxy.ts` (middleware) intercepts unauthenticated requests, while `firestore.rules` enforces secure data access at the database level.
- **Registration Flow**: Workers can self-register, but must be approved by a Master Admin before receiving a SENTINEL ID.

### 2. QR Code & Digital Identification
- **Automatic ID Generation**: Approved workers automatically get a digital, downloadable ID card.
- **QR Scannability**: The public-facing `/worker/[publicId]` URL presents emergency identification without exposing sensitive information (such as dosage history or personal phone numbers).

### 3. Manager Dosimeter Scanning (Core Workflow)
- **5-Step Scan Flow**: Managers can search workers, scan their dosimeter strips, and capture an image using the HTML5 camera API (`useCamera.ts`).
- **Colorimetric Analysis**: Built a foundational framework in `imageAnalysis.ts` that captures image data.
- **Modular Calibration Model**: The math logic (e.g., CIE76/CIE94 distance to Dose approximation) is securely implemented and configurable via `calibrationModel.ts`.
- **Synthetic Demo Mode**: Allowed in the global settings, letting managers simulate exposure reads when not in the field.

### 4. Admin Analytics & Operations
- **Recharts Integration**: Implemented a responsive dashboard with visual analytics (pie charts for exposure levels and bar charts for shift breakdowns).
- **Dosimeter Lifecycle**: Admins can track the physical state of the dosimeter pads, replacing them directly from the UI when physically changed.
- **Full Audit Logging**: Sensitive actions (like requests approval or dosimeter changes) append an immutable record to the `audit_logs` collection.

## Technical Architecture & Security
- **Framework**: Next.js 14 App Router
- **Backend**: Firebase Authentication & Firestore
- **State**: React Context API (`AuthContext`)
- **Styling**: Pure CSS with CSS Variables to enforce the Navy/Grey/White industrial theme (`globals.css`).
- **Security Rules**: Deployed `firestore.rules` containing granular, role-based database triggers for `workers`, `users`, `exposure_records`, `worker_requests`, and `audit_logs`.

## Deployment Handover
The application builds successfully with `npm run build`.

> [!TIP]
> The UI includes a fully integrated dark mode accessible via the moon/sun icon in the top navigation bar.

> [!IMPORTANT]
> Be sure to provide the production Firebase API keys to `.env.local` prior to actual deployment to Vercel/Firebase App Hosting.
