# Aser Trading — Commercial Intelligence UI

> **Modern, Signal-driven Angular 19 Frontend for Aser Trading's Public Storefront and Enterprise Multi-Branch Inventory & Commercial ERP System.**

---

## 🌟 Overview

**Aser Trading** is an integrated commercial printing, advertising branding, and industrial raw material distribution partner based in Ethiopia. 

This repository contains the full single-page application (SPA) powering both the **public customer-facing storefront** and the **internal operational ERP/warehouse dashboard**. The system features real-time inventory management across multiple geographic branches (Headquarters, Merkato, Adama, Bole, Axum, Hawassa, Dire Dawa), weighted-average cost (WAC) valuation, multi-stage inter-branch logistics transfers, customer order settlement, and commercial intelligence reporting with Excel exports.

---

## 🚀 Key Capabilities & Features

### 1. Public Storefront & Customer Portal
- **Brand Showcase & Value Pillars**: Highlighting commercial offset printing, vehicle branding, Korean PU vinyls, DTF films, and industrial machinery.
- **Dynamic Catalog**: Full catalog browsing with category filtering, real-time stock availability badges, search, and paginated product grids.
- **Product Detail & Media Gallery**: Rich multi-image sliders, technical specifications, SKU tracking, and fallback visual art for uncached products.
- **Cart & Ordering Drawer**: Reactive shopping cart with live quantity management, subtotal calculation, and instant stock validation.
- **Checkout & Settlement**:
  - Choice between **Branch Collection** (pickup from a designated hub) and **Direct Address Delivery**
 
- **Quotation Workflow**: Instant quote requests for custom industrial printing and non-standard bulk commercial orders.
- **Branch Directory**: Public exploration of operating branch locations, facilities, and contact points.
- **Bilingual Internationalization (i18n)**: Seamless language switching between **English** and **Amharic (አማርኛ)**.

### 2. Enterprise Administration & ERP Portal (`/app`)
- **Executive Intelligence Dashboard**:
  - Live revenue, active orders count, pending logistics shipments, low-stock threshold alerts, and real-time network stock valuation.
  - Branch valuation breakdown detailing live ETB asset distribution across operating warehouses.
- **Stock Inventory Control**:
  - Live physical units on hand, reserved quantities, and available units.
  - Weighted Average Cost (WAC) tracking and live asset valuation per warehouse.
  - Interactive **Stock Receipt Modal** for registering new purchase batches with automatic WAC re-calculation.
- **Product Catalog Management**:
  - Creation and management of products, base units of measure (UOM), and category assignments.
  - S3 cloud media upload integration for persistent image storage.
- **Commercial Services Management**:
  - Setup and management of commercial service lines (Offset Press, Vehicle Wraps, Signage Fabrication, Equipment Servicing).
- **Inter-Branch Stock Transfers**:
  - Multi-stage transfer lifecycle: `PENDING` $\rightarrow$ `APPROVED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `RECEIVED` / `REJECTED`.
  - Discrepancy reporting and resolution tracking for transit losses or damages.
  - Strict branch-scoped visibility to prevent unauthorized data access across locations.
- **Sales & Order Fulfillment**:
  - Real-time order pipeline management with status updates (`PENDING_PAYMENT`, `PROCESSING`, `READY_FOR_DISPATCH`, `DELIVERED`, `CANCELLED`).
  - Automated stock reservation release on order cancellation.
  - Printable delivery slips and commercial tax invoices.
- **Commercial Intelligence & Audit Reports**:
  - 4 specialized reporting modules: **Sales & Order Revenue**, **Stock Valuation (WAC Audit)**, **Cross-Branch Stock Summary**, and **Logistics & Transfer Performance**.
  - Multi-sheet and per-tab automated Excel export powered by SheetJS (`xlsx`).
- **Administration & Security**:
  - Branch network directory and automatic default warehouse provisioning.
  - Employee directory with role assignment, status toggling, and temporary credential generation.
  - System activity audit logs capturing operations across inventory, transfers, and security events.

---

## 🛠 Technology Stack & Architecture

- **Framework**: Angular 19+ (Modern standalone components, standalone routing, no `NgModules`)
- **Reactive State Management**: Angular Signals (`signal`, `computed`, `effect`) via centralized `AserStateService`
- **Language**: TypeScript 5.8+ (Strict type checking enabled)
- **Styling**: Native CSS3 with CSS Custom Properties design system (no heavy UI frameworks, optimal performance)
- **Icons**: SVG icon pipeline with pre-bundled Lucide icons (`iconify-icon`) eliminating external CDN latency
- **Reporting & Data Export**: SheetJS (`xlsx`) for client-side multi-sheet spreadsheet generation
- **HTTP & Security**: Angular `HttpClient` with functional HTTP interceptors for automatic JWT Bearer injection and 401 error routing

---

## 🔐 Role-Based Access Control (RBAC) & Scoping

The system enforces strict multi-level role-based authorization across frontend navigation and backend endpoints

## 📋 Prerequisites & System Requirements

- **Node.js**: `v20.19.0+` or `v22.12.0+` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Backend API**: Running instance of `asertrading` Spring Boot API (`http://localhost:8085`)

---

## ⚡ Quick Start & Local Development

1. **Clone the repository and enter the directory**:
   ```bash
   cd c:\Zekarias\aser-trading-ui
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm start
   ```
   *(Runs `ng serve --host 0.0.0.0` for local and network device testing).*

4. **Access the application**:
   - **Public Storefront**: Navigate to `http://localhost:4200`
   - **Admin / Staff Portal**: Navigate to `http://localhost:4200/app`

---





## 📁 Project Structure

```
src/
├── app/
│   ├── core/                           # Singleton core services, guards, and shared components
│   │   ├── components/                 # Core reusable UI (icon bundle, image-slider, toast, paginator)
│   │   ├── guards/                     # AuthGuard and RoleGuards for route protection
│   │   ├── interceptors/               # JWT token attachment and error interception
│   │   ├── models/                     # TypeScript domain models and enums
│   │   ├── pipes/                      # Custom pipes (translate, currency, number formats)
│   │   └── services/                   # Centralized state (aser-state.service) and API clients
│   │       └── api/                    # Type-safe HTTP services (catalog, inventory, orders, reports, etc.)
│   └── features/                       # Modular feature domains
│       ├── admin/                      # ERP / Management portal
│       │   ├── components/             # Admin modals (receive stock, add product, transfer, order details)
│       │   ├── layout/                 # Admin shell, responsive sidebar navigation, topbar
│       │   └── pages/                  # Admin feature views (dashboard, inventory, orders, reports, etc.)
│       └── public/                     # Public customer storefront
│           ├── components/             # Storefront header, footer, cart drawer, checkout modal
│           └── pages/                  # Public views (home, catalog, services, branches)
├── assets/                             # Logos, branding images, and i18n JSON resource files
│   └── i18n/                           # Internationalization dictionaries (en.json, am.json)
└── styles.css                          # Master design tokens, resets, utility classes, and layout rules
```

---

## 📜 Scripts Reference

| Command | Description |
| :--- | :--- |
| `npm start` | Starts local Angular dev server on port `4200` bound to `0.0.0.0` |
| `npm run build` | Builds optimized production bundle into `dist/aser-trading` |
| `npm run watch` | Builds in development mode with active file watching for rapid iteration |

---



## 📄 License & Ownership
Copyright © 2026 **Aser Trading PLC**. All Rights Reserved.  
Proprietary software for Aser Trading commercial operations and authorized enterprise personnel.
