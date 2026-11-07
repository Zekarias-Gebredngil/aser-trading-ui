 TRADING
Software Requirements Specification (SRS)
Public Website, E-Commerce Platform & Multi-Branch Inventory Management System
Document version: 1.0 — Finalized Requirements Baseline
Prepared for: Aser Trading
Business: Printing Press, Branding & Promotion, Garment Materials, Printing Materials and Equipment Distribution
Deployment: Cloud-hosted
Currency: Ethiopian Birr (ETB), configurable
Status: Ready for stakeholder review, estimation and implementation planning
________________________________________
1. Executive Summary
Aser Trading requires an integrated digital platform that combines a professional public website, an online sales platform and a centralized inventory management system.
The platform will enable customers to discover services, browse products, request quotations, place orders online and track their order status. Authorized employees will manage products, stock, procurement, orders, payments, inventory transfers and reports across multiple branches.
The system will use Aser Trading's existing logo and brand identity, emphasizing its primary blue, black and white colors, with limited use of the logo's accent colors.
1.1 Confirmed business decisions
Decision	Confirmed requirement
Branch structure	Multiple branches from launch
Sales model	Online ordering and sales included
Inventory costing	Weighted-average cost
Public stock availability	Display availability status
Transfer approvals	Controlled approval workflow
Units of measurement	Multiple units, including meters, rolls, kilograms and pieces
Existing data	Import inventory records from spreadsheets
Hosting	Cloud-hosted deployment
1.2 Business objectives
1.	Establish a professional online presence.
2.	Generate inquiries and sales through the website.
3.	Enable customers to order eligible products online.
4.	Maintain accurate inventory across branches and warehouses.
5.	Prevent unauthorized stock movements and duplicate transactions.
6.	Control inter-branch transfers and equipment relocation.
7.	Calculate inventory value using weighted-average costing.
8.	Give management reliable sales, inventory, purchasing and branch reports.
9.	Provide a secure, auditable and maintainable business platform.
2. Project Scope
2.1 Included in the initial release
Public website
•	Home, About Us, Services, Products, Branches and Contact pages.
•	Printing press service catalog.
•	Branding and promotion service catalog.
•	Garment materials catalog.
•	Printing press materials catalog.
•	Search, filtering and product detail pages.
•	Public product availability indicators.
•	Customer inquiries and quotation requests.
•	Staff login.
E-commerce
•	Shopping cart.
•	Customer registration and guest checkout, subject to configured policies.
•	Checkout and order creation.
•	Shipping or branch collection options, according to company policy.
•	Configurable delivery charges.
•	Order confirmation and order history.
•	Payment status tracking.
•	Order cancellation and returns workflows.
•	Administrative order processing.
Inventory management
•	Product and category management.
•	Multiple branches and warehouses.
•	Stock receipts and issues.
•	Inter-branch transfers.
•	Stock adjustments and physical counts.
•	Supplier and purchase-order management.
•	Weighted-average inventory valuation.
•	Stock reservations for online orders.
•	Reorder alerts and inventory reports.
•	Spreadsheet-based opening inventory migration.
Administration
•	User, role and permission management.
•	Website content management.
•	Sales and inventory dashboards.
•	Audit logs.
•	Notifications.
•	Backup and recovery.
•	Cloud deployment and CI/CD.
2.2 Excluded unless separately approved
•	Full accounting and general ledger.
•	Payroll and human resources.
•	Full manufacturing and production planning.
•	Advanced print-job production costing.
•	A dedicated native mobile application.
•	Automated procurement forecasting using machine learning.
•	Third-party ERP integration.
•	Multi-currency accounting.
•	Advanced customer loyalty programs.
Payment gateway selection, shipping providers, SMS services and third-party integrations must be confirmed before their specific integration scope can be finalized.
3. Business Users and Access Control
Role	Responsibilities
System Administrator	Technical settings, users, roles and system configuration.
Company Manager	Company-wide oversight, designated approvals and reporting.
Inventory Manager	Products, stock policies, inventory adjustments and inventory oversight.
Branch Manager	Branch operations, local approvals and branch reporting.
Storekeeper	Receipts, issues, counts and authorized transfer operations.
Procurement Officer	Suppliers, purchase orders and receiving coordination.
Sales Officer	Customer orders, order processing and customer inquiries.
Accountant / Auditor	Review sales, payments, costing, inventory valuation and audit records.
Website Manager	Public pages, promotional content and product publication.
Customer	Browse products, place orders and view their own orders.
Guest Customer	Browse products and place orders under the guest-checkout policy.
Permissions must be enforced by the backend. Branch-scoped employees must not access unauthorized branch data. Administrative privileges must be separated from ordinary sales and inventory operations.
4. Public Website Requirements
4.1 Home page
The home page shall:
•	Display the Aser Trading logo and corporate identity.
•	Introduce the company's main business areas.
•	Promote featured services and products.
•	Show calls to action for shopping, quotations and contact.
•	Provide links to company branches and contact information.
•	Offer an accessible staff-login entry point.
4.2 Service catalog
The service catalog shall support:
•	Printing press services.
•	Branding and promotional services.
•	Custom printing inquiries.
•	Optional project galleries and sample work.
•	Quotation requests with customer contact information, quantities, specifications and attachments where enabled.
Services requiring custom pricing must use a quotation workflow rather than forcing customers through standard product checkout.
4.3 Product catalog
Each published product may contain:
•	Product name, SKU and description.
•	Category, images and specifications.
•	Unit of measurement.
•	Selling price or quotation-only pricing policy.
•	Product variants where relevant.
•	Public availability status.
•	Eligible fulfillment methods.
Only authorized users may publish products or modify public content.
4.4 Public availability
The website shall display a configurable availability status such as:
•	In stock.
•	Limited availability.
•	Out of stock.
•	Available on request.
Availability must be derived from eligible stock according to a company-defined policy. It must not expose supplier costs, internal stock movements or sensitive branch balances.
Public availability is informational; final stock allocation must be validated during checkout.
5. E-Commerce Requirements
5.1 Shopping cart
Customers shall be able to:
•	Add and remove products.
•	Change quantities.
•	Select available variants.
•	View item prices and subtotals.
•	Review applicable delivery charges and discounts.
•	View the total payable amount before submitting the order.
The server must recalculate all prices, discounts, taxes and totals. Client-submitted totals must never be trusted.
5.2 Checkout
Checkout shall collect the minimum information needed to fulfill the order:
•	Customer name.
•	Phone number and email, as configured.
•	Delivery address or collection branch.
•	Requested products and quantities.
•	Delivery or collection preference.
•	Payment method, if enabled.
•	Customer notes where applicable.
The checkout must validate product status, price, order quantity, branch availability and delivery eligibility.
5.3 Order lifecycle
Recommended order states:
PENDING_PAYMENT → CONFIRMED → PROCESSING → READY_FOR_DISPATCH → DISPATCHED → DELIVERED
Additional states:
•	PENDING_REVIEW
•	CANCELLED
•	PAYMENT_FAILED
•	RETURN_REQUESTED
•	RETURNED
•	REFUNDED
Allowed transitions must be explicitly defined. A delivered order cannot be silently returned to processing. Corrections must use authorized return, cancellation or compensation workflows.
5.4 Inventory reservation
The system shall reserve eligible stock when the business-approved order confirmation event occurs.
The reservation policy must define:
•	When stock is reserved.
•	How long unpaid orders remain reserved.
•	When expired reservations are released.
•	How payment failures affect reservations.
•	How cancellations restore availability.
•	Whether an order can be fulfilled across multiple branches.
The system must prevent concurrent checkouts from selling the same available units.
For orders that cannot be fulfilled immediately, the customer must receive a clear status rather than a false confirmation.
5.5 Fulfillment
The initial release shall support the confirmed fulfillment options:
•	Delivery to a customer address.
•	Collection from an eligible branch.
The company must define delivery fees, eligible destinations, collection rules, delivery status transitions and responsibility for dispatch confirmation.
Integration with a third-party delivery provider is optional unless explicitly included.
5.6 Payment processing
The platform shall maintain payment records associated with orders.
Payment requirements:
•	Support configurable payment methods.
•	Record payment amount, currency, status, reference and timestamps.
•	Verify payment confirmations through trusted server-side mechanisms.
•	Support pending, successful, failed, cancelled and refunded payment states.
•	Prevent duplicate payment posting.
•	Reconcile payment references with orders.
•	Restrict payment adjustments and refunds to authorized roles.
Payment gateway decision: The specific provider and integration method remain to be selected by Aser Trading. Telebirr may be evaluated as a candidate. The project estimate must separately identify any gateway integration, provider onboarding and transaction fees.=> Future Scope
The platform must never store raw card credentials or treat an unverified browser redirect as proof of payment.
5.7 Returns and refunds
The system shall support:
•	Customer return requests.
•	Return eligibility checks.
•	Authorized return approval.
•	Inspection of returned products.
•	Restocking or quarantining returned goods.
•	Refund tracking where applicable.
•	Audit records for every return and refund.
Returned goods must not automatically become saleable stock until the required inspection or approval is complete.
6. Inventory Management Requirements
6.1 Product management
Each inventory product shall support:
•	Unique SKU.
•	Optional barcode.
•	Product name and description.
•	Category and subcategory.
•	Base unit of measurement.
•	Optional alternative units and conversion rules.
•	Purchase cost and selling price.
•	Reorder threshold.
•	Preferred supplier.
•	Product status.
•	Public publication status.
•	Optional batch, lot or serial tracking.
Referenced products must be archived instead of deleted.
6.2 Units of measurement
The platform shall support units such as:
•	Piece.
•	Meter.
•	Roll.
•	Kilogram.
•	Liter.
•	Box.
•	Pack.
•	Other configurable units.
A product shall have a defined inventory base unit. Alternative units may be used only when a valid conversion rule exists.
For example, a product may be purchased in rolls and managed in meters only if the roll's conversion quantity is known and the business permits that conversion.
The system must not assume every roll has the same length unless that is an approved product rule. Batch-specific quantities or individual roll tracking may be required.
6.3 Branches and warehouses
The system shall support:
•	Multiple active branches.
•	Multiple warehouses per branch.
•	Branch-specific access permissions.
•	Independent stock balances.
•	Branch-level reorder thresholds.
•	Local stock receipts and issues.
•	Inter-warehouse and inter-branch transfers.
•	Consolidated company-wide reporting.
6.4 Stock receipts
Authorized users shall record:
•	Supplier deliveries.
•	Purchase-order receipts.
•	Opening inventory.
•	Approved returns.
•	Other authorized stock increases.
Every receipt must identify the destination, product, quantity, unit, cost where applicable, responsible user and supporting reference.
Receipt posting must update the stock ledger and stock balance atomically.
6.5 Stock issues
Authorized users shall issue stock for:
•	Sales orders.
•	Internal use.
•	Samples.
•	Damaged or unusable goods.
•	Other approved business reasons.
Sales-related issues must reference an order or authorized sales document.
The system shall prevent issuing more stock than is available unless a controlled exception is explicitly approved.
6.6 Inter-branch transfers
Transfer approval is controlled and must follow the company's configured authorization rules.
Workflow
1.	Create a transfer request.
2.	Validate source, destination, products and quantities.
3.	Submit for approval.
4.	Approve or reject.
5.	Dispatch the approved stock.
6.	Record goods in transit.
7.	Confirm destination receipt.
8.	Reconcile discrepancies.
9.	Complete and audit the transfer.
Required statuses
DRAFT → PENDING_APPROVAL → APPROVED → IN_TRANSIT → RECEIVED
Additional statuses:
•	REJECTED
•	CANCELLED
•	PARTIALLY_RECEIVED
•	DISCREPANCY_REVIEW
•	CLOSED_WITH_VARIANCE
Transfer rules
•	Source and destination must be different valid stock locations.
•	The requesting user must have appropriate source-location access.
•	Approval must follow configured branch, quantity or value thresholds.
•	Users must not approve their own transactions when separation of duties is required.
•	Stock availability must be checked again at dispatch.
•	Dispatch must deduct source stock and register goods in transit atomically.
•	Destination receipt must record actual quantities.
•	Shortages, damage and excess quantities require discrepancy records.
•	A transfer cannot be dispatched or received twice.
•	Cancellation after dispatch must use a controlled return or reversal.
•	Each event must record actor, timestamp and supporting notes.
6.7 Stock counts and adjustments
The platform shall support:
•	Physical stock-count sessions.
•	Counted quantities.
•	Variance calculation.
•	Reason codes and supporting documents.
•	Configurable approval thresholds.
•	Posting approved adjustments.
•	Full audit history.
Stock adjustments must not overwrite historical stock transactions.
7. Weighted-Average Inventory Costing
Aser Trading has selected weighted-average costing for inventory valuation.
7.1 Cost calculation
For a product using a consistent base unit:
New weighted-average cost
(Existing stock quantity × Existing average cost + Received quantity × Received unit cost) / Total stock quantity after receipt
Example:
•	Existing stock: 100 meters at ETB 50 per meter.
•	New receipt: 50 meters at ETB 60 per meter.
•	Total stock: 150 meters.
•	Total inventory cost: ETB 8,000.
•	New average cost: ETB 53.3333 per meter, approximately.
The system must retain sufficient decimal precision internally and apply the approved rounding policy to displayed monetary amounts.
7.2 Costing rules
•	Purchase costs must be normalized to the product's base unit.
•	Eligible landed costs may be included according to the approved accounting policy.
•	Issues use the applicable weighted-average cost at posting time.
•	Returns and reversals must reference the original transaction where possible.
•	Cost changes must be auditable.
•	Historical transactions must retain their original posted values.
•	Stock valuation reports must use consistent cost snapshots and transaction cutoffs.
•	Zero-stock and negative-stock exceptions must have explicit cost-handling rules.
Aser Trading's accountant must approve the treatment of freight, purchase returns, discounts, taxes and other landed costs before production costing is finalized.
8. Procurement and Suppliers
The system shall support:
•	Supplier records.
•	Purchase orders.
•	Order approval.
•	Partial deliveries.
•	Outstanding quantity tracking.
•	Goods receipts.
•	Supplier references and attachments.
•	Purchase cost recording.
Purchase-order states shall include draft, submitted, approved, partially received, received and cancelled.
Full accounts payable and supplier invoice accounting are outside the baseline scope unless added by agreement.
9. Functional Requirements Register
ID	Requirement	Priority
FR-01	Publish responsive public pages and company information.	Must
FR-02	Manage published service and product catalogs.	Must
FR-03	Submit and track customer inquiries and quotations.	Must
FR-04	Authenticate staff and enforce role-based access.	Must
FR-05	Manage products, categories, units and conversions.	Must
FR-06	Manage multiple branches and warehouses.	Must
FR-07	Record stock receipts, issues and adjustments.	Must
FR-08	Execute controlled inter-branch transfers.	Must
FR-09	Calculate weighted-average inventory cost.	Must
FR-10	Support shopping carts and online checkout.	Must
FR-11	Maintain customer orders and fulfillment status.	Must
FR-12	Integrate the selected payment method or gateway.	Must for production payment acceptance; provider selection is pending
FR-13	Reserve and release inventory for orders.	Must
FR-14	Process authorized returns and refunds.	Must
FR-15	Import approved spreadsheet inventory data.	Must
FR-16	Produce sales, inventory and branch reports.	Must
FR-17	Maintain stock ledger and audit records.	Must
FR-18	Provide low-stock alerts.	Must
FR-19	Export authorized reports.	Should
FR-20	Support barcode scanning.	Should
FR-21	Provide advanced analytics and forecasting.	Could
10. Solution Architecture
10.1 Architectural approach
Use a modular monolith for the initial release. This keeps inventory, order and payment operations manageable within clear database transaction boundaries.
The architecture shall contain:
•	Public website and e-commerce frontend.
•	Protected administration dashboard.
•	Versioned REST API.
•	Identity and access module.
•	Product catalog module.
•	Inventory ledger module.
•	Branch and warehouse module.
•	Transfer workflow module.
•	Procurement module.
•	Sales and order module.
•	Payment integration module.
•	Customer inquiry module.
•	Reporting and audit module.
•	Notification module.
10.2 Recommended technology stack
Layer	Technology
Frontend	Angular, TypeScript 
Styling	Tailwind CSS and accessible reusable components
Backend	Java 21+ and Spring Boot
Security	Spring Security
Database	PostgreSQL
Migrations	Liquibase
API specification	OpenAPI
Testing	JUnit 5, Spring Boot Test, Testcontainers and Playwright
File storage	Private S3-compatible object storage
Caching	Redis if justified by performance or session requirements
Containerization	Docker
CI/CD	GitHub CI(GitHub Actions)
Reverse proxy	Nginx or managed HTTPS ingress
Monitoring	Centralized logs, health checks and application metrics
10.3 Architecture principles
•	PostgreSQL is the source of truth for stock, orders, payments and transaction history.
•	Inventory changes must be performed through authorized application services.
•	Related stock, order and reservation changes must use database transactions.
•	External payment processing must not hold a database transaction open while waiting for a provider.
•	Payment callbacks must be verified and idempotent.
•	Domain modules must communicate through explicit interfaces.
•	File uploads must use controlled storage rather than public server directories.
•	Database changes must be version-controlled and tested.

11. Database Design
11.1 Core tables
Identity and access
•	users
•	roles
•	permissions
•	user_roles
•	role_permissions
•	user_branch_access
•	user_sessions
Organization and catalog
•	branches
•	warehouses
•	product_categories
•	products
•	product_variants
•	units_of_measure
•	unit_conversions
•	product_media
Inventory
•	stock_balances
•	stock_movements
•	stock_reservations
•	stock_transfers
•	transfer_items
•	transfer_events
•	transfer_discrepancies
•	stock_counts
•	stock_count_items
•	inventory_adjustments
Procurement
•	suppliers
•	purchase_orders
•	purchase_order_items
•	goods_receipts
•	goods_receipt_items
E-commerce
•	customers
•	customer_addresses
•	carts
•	cart_items
•	orders
•	order_items
•	order_status_history
•	shipments
•	returns
•	return_items
Payments
•	payments
•	payment_events
•	refunds
•	payment_idempotency_keys
Website and governance
•	customer_inquiries
•	content_pages
•	audit_logs
•	notifications
•	spreadsheet_import_jobs
•	spreadsheet_import_errors
11.2 Important fields and constraints
Products must have unique SKUs. Warehouses must belong to branches. Stock balances must be unique for the applicable product, warehouse and tracking dimension.
Stock movements must include:
•	Product and location.
•	Quantity delta in base units.
•	Movement type.
•	Reference type and reference ID.
•	Actor.
•	Posting timestamp.
•	Cost information where applicable.
•	Correlation or idempotency reference where appropriate.
Orders must contain immutable-at-confirmation line-item snapshots of product description, SKU, unit price, quantity, discounts and applicable tax calculations.
Payments must reference orders and retain provider transaction identifiers where applicable.
Foreign keys, check constraints, unique constraints and appropriate indexes must enforce data integrity.
Monetary amounts must use exact decimal types. Inventory quantities must use an appropriate fixed-precision decimal type when fractional quantities are permitted.
11.3 Inventory invariants
For each product and stock location:
On-hand quantity = opening quantity + sum of posted stock movement deltas
Reserved quantity must be maintained separately from physical on-hand quantity.
Available to sell = eligible on-hand quantity − active reservations
Eligibility must account for stock that is damaged, quarantined, in transit or otherwise unavailable for sale.
The inventory ledger must be append-only through ordinary application workflows. Corrections must use traceable compensating movements.
11.4 Order and payment integrity
•	A single order must not be confirmed twice.
•	Payment confirmation must not create duplicate order fulfillment.
•	Duplicate payment callbacks must be safely ignored or reconciled.
•	Stock reservation and order-state changes must be atomic where they share a database boundary.
•	Payment-provider calls must use unique idempotency references where supported.
•	Failed payment attempts must not be interpreted as successful payments.
•	Refunds must be linked to authorized return or cancellation decisions.
12. REST API Specification
All endpoints shall be versioned under /api/v1. The final API contract shall be published through OpenAPI.
12.1 Authentication
Method	Endpoint	Purpose
POST	/auth/login	Authenticate staff or customers according to policy.
POST	/auth/logout	Revoke the current session.
POST	/auth/refresh	Refresh authentication where supported.
GET	/auth/me	Return the current authenticated identity.
POST	/auth/password-reset	Initiate a secure password-reset flow.
12.2 Public website and catalog
Method	Endpoint	Purpose
GET	/public/services	List published services.
GET	/public/products	Search published products.
GET	/public/products/{slug}	Retrieve product details.
GET	/public/branches	List public branch information.
POST	/public/inquiries	Submit an inquiry.
12.3 Products and inventory
Method	Endpoint	Purpose
GET / POST	/products	Search and create products.
GET / PATCH	/products/{id}	Retrieve and update products.
GET / POST	/branches	List and create branches.
GET / POST	/warehouses	List and create warehouses.
GET	/inventory/balances	Retrieve authorized stock balances.
GET	/inventory/movements	Search stock movement history.
POST	/inventory/receipts	Record stock receipts.
POST	/inventory/issues	Record stock issues.
POST	/inventory/adjustments	Submit adjustments.
POST	/inventory/counts	Start stock counts.
12.4 Transfers
Method	Endpoint	Purpose
POST	/transfers	Create a transfer request.
GET	/transfers	List authorized transfers.
GET	/transfers/{id}	Retrieve transfer details.
POST	/transfers/{id}/submit	Submit for approval.
POST	/transfers/{id}/approve	Approve transfer.
POST	/transfers/{id}/reject	Reject transfer.
POST	/transfers/{id}/dispatch	Dispatch goods.
POST	/transfers/{id}/receive	Record destination receipt.
POST	/transfers/{id}/report-discrepancy	Record a discrepancy.
GET	/transfers/{id}/events	Retrieve transfer history.
12.5 E-commerce and payments
Method	Endpoint	Purpose
GET / POST	/cart/items	View or add cart items.
PATCH / DELETE	/cart/items/{id}	Update or remove cart items.
POST	/checkout/quote	Validate cart and calculate server-side totals.
POST	/orders	Create an order from a validated cart.
GET	/orders	Retrieve the current user's authorized orders.
GET	/orders/{id}	Retrieve an authorized order.
POST	/orders/{id}/cancel	Request or execute an eligible cancellation.
POST	/orders/{id}/confirm	Perform an authorized order confirmation action.
POST	/payments/initiate	Initiate payment through the configured provider.
GET	/payments/{id}	Retrieve payment status.
POST	/payments/webhooks/{provider}	Receive verified provider events.
POST	/orders/{id}/returns	Request a return.
POST	/returns/{id}/approve	Approve an authorized return.
POST	/returns/{id}/refund	Initiate an authorized refund.
Payment webhooks must verify provider signatures or equivalent authentication and reject invalid requests.
12.6 Procurement and reporting
Method	Endpoint	Purpose
GET / POST	/suppliers	List and create suppliers.
GET / POST	/purchase-orders	List and create purchase orders.
POST	/purchase-orders/{id}/approve	Approve an order.
POST	/purchase-orders/{id}/receipts	Record a supplier delivery.
GET	/reports/stock-summary	Stock summary by branch.
GET	/reports/stock-valuation	Weighted-average inventory valuation.
GET	/reports/sales	Sales reporting.
GET	/reports/transfer-history	Transfer reporting.
GET	/audit-logs	Search authorized audit records.
POST	/admin/imports/inventory	Upload a spreadsheet for inventory import.
GET	/admin/imports/{id}	Retrieve import validation results.
POST	/admin/imports/{id}/commit	Commit an approved import.
Endpoints are illustrative API contracts; exact request schemas, response formats, status codes and permissions must be documented during implementation.
13. Spreadsheet Migration Requirements
The project shall support importing opening inventory from approved Excel or CSV spreadsheets.
13.1 Import workflow
1.	Download the approved import template.
2.	Upload the spreadsheet.
3.	Validate columns, product identifiers, units, locations and quantities.
4.	Generate a preview of valid and invalid rows.
5.	Resolve validation errors.
6.	Approve the import.
7.	Commit the import transaction.
8.	Produce an import summary and audit record.
13.2 Migration rules
•	Validate unique SKUs and branch/warehouse references.
•	Validate units and conversion rules.
•	Validate costs and quantities.
•	Reject invalid or ambiguous rows.
•	Avoid creating duplicate products unintentionally.
•	Require explicit approval before creating opening stock balances.
•	Record imported quantities as opening inventory movements.
•	Preserve source filenames, import timestamps and responsible users.
•	Support dry-run validation without changing live inventory.
•	Prevent the same import job from being committed twice.
•	Restrict access to uploaded files and import reports.
Before migration, Aser Trading must supply its spreadsheets and approve a mapping of columns to system fields.
14. Security Requirements
14.1 Authentication and authorization
•	Use secure password hashing.
•	Apply rate limiting to login and public endpoints.
•	Use secure, HTTP-only session cookies or a carefully implemented access/refresh-token model.
•	Revoke sessions when users are deactivated.
•	Require backend permission checks for every protected operation.
•	Enforce branch-level access restrictions.
•	Apply multifactor authentication for privileged users where feasible.
•	Prevent users from approving their own restricted transactions when separation of duties applies.
14.2 E-commerce security
•	Recalculate all checkout prices and totals on the server.
•	Validate product availability during order creation.
•	Protect against duplicate checkout submissions.
•	Verify payment callbacks.
•	Prevent customers from accessing other customers' orders.
•	Restrict refund and payment-adjustment permissions.
•	Apply anti-spam and rate-limit protections to public forms.
•	Avoid storing sensitive payment credentials.
14.3 Application security
•	Enforce HTTPS.
•	Validate all input and use parameterized database queries.
•	Apply CSRF protection for cookie-based sessions.
•	Restrict CORS to approved origins.
•	Protect against XSS and insecure file uploads.
•	Keep secrets out of source control.
•	Encrypt sensitive data at rest where supported.
•	Use dependency and container scanning.
•	Never expose stack traces or secrets in public error responses.
14.4 Audit requirements
Audit sensitive actions, including:
•	Login and security events.
•	User and role changes.
•	Product cost changes.
•	Stock receipts, issues and adjustments.
•	Transfer approvals, dispatches and receipts.
•	Order status changes.
•	Payment confirmations and refunds.
•	Spreadsheet imports.
•	Administrative configuration changes.
Logs must identify the actor, action, entity, timestamp and outcome. Passwords, tokens and unnecessary personal data must not be logged.
15. Non-Functional Requirements
Area	Target
Availability	99.5% monthly availability, excluding agreed maintenance.
Read performance	Typical read APIs within 500 ms at the 95th percentile under the agreed load.
Write performance	Typical inventory and order APIs within 1 second at the 95th percentile under the agreed load, excluding external dependencies.
Data integrity	No lost or duplicated inventory postings in defined concurrency and retry tests.
Security	No unresolved critical or high-severity findings at release.
Accessibility	Target WCAG 2.2 AA for primary workflows.
Compatibility	Current major desktop browsers and responsive mobile layouts.
Scalability	Support additional branches, warehouses, products and customers without redesigning the core data model.
Recovery	Documented RPO and RTO approved by the business.
Localization	Configurable currency, date and language presentation.
Maintainability	Modular code, automated tests and versioned database migrations.
Performance targets must be measured under a jointly agreed load profile.
16. Reporting Requirements
The system shall provide:
•	Current stock by branch and warehouse.
•	Low-stock and out-of-stock products.
•	Inventory movement history.
•	Inter-branch transfer history.
•	Stock discrepancy and adjustment reports.
•	Weighted-average inventory valuation.
•	Sales by date, branch and product.
•	Order fulfillment status.
•	Payment reconciliation and refund reports.
•	Purchase orders and outstanding supplier deliveries.
•	Customer inquiries.
•	Audit and user activity reports.
Reports must respect user permissions and support CSV or Excel export where authorized.
17. Acceptance Tests
17.1 Public website
1.	Visitors can browse published services and products.
2.	Product availability is displayed according to configured rules.
3.	Public APIs do not expose supplier costs or private inventory records.
4.	Quotation requests are stored once and receive unique references.
5.	Unauthorized users cannot publish content.
17.2 Online sales
6.	Customers can add products to a cart and update quantities.
7.	Server-side checkout recalculates prices and totals.
8.	Orders cannot be created for inactive or ineligible products.
9.	Concurrent checkouts cannot oversell available stock.
10.	An order's reservation is created and released according to policy.
11.	Duplicate checkout submissions do not create duplicate orders.
12.	Invalid payment confirmations are rejected.
13.	Duplicate payment callbacks do not create duplicate payment postings.
14.	A failed payment does not mark an order paid.
15.	Authorized cancellations and returns update stock and order states correctly.
16.	Customers cannot access another customer's order.
17.	Refunds are restricted to authorized roles.
17.3 Inventory and transfers
18.	Receiving 100 units increases stock by exactly 100.
19.	An issue exceeding available stock is rejected by default.
20.	Dispatching 20 units reduces source stock by 20 and records 20 in transit.
21.	Receiving the transfer increases destination stock by the actual received quantity.
22.	A partial receipt records a discrepancy and prevents false completion.
23.	Repeating a dispatch request does not deduct stock twice.
24.	Simultaneous stock issues cannot consume more than the available balance.
25.	A user without approval permission cannot approve a transfer.
26.	A branch user cannot access another branch's restricted records.
27.	Approved adjustments produce traceable ledger entries.
28.	Historical stock transactions cannot be silently edited.
17.4 Weighted-average costing
29.	Receiving inventory at a new cost recalculates the weighted-average cost correctly.
30.	Issues use the applicable average cost at posting time.
31.	Cost calculations use base units and defined precision.
32.	Returns and reversals preserve traceability.
33.	Inventory valuation reports reconcile to the defined costing policy.
17.5 Spreadsheet migration and operations
34.	Invalid spreadsheets are rejected with row-level error details.
35.	Dry-run imports do not modify inventory.
36.	An approved import creates opening balances exactly once.
37.	Duplicate import commits are prevented.
38.	Backup restoration recovers inventory, orders and transaction history.
39.	Revoked users cannot continue accessing protected operations.
40.	Production health checks and post-deployment smoke tests pass.
Release requires successful completion of critical business, security and data-integrity tests, followed by business acceptance.
18. Cloud Deployment and DevOps
18.1 Deployment architecture
The cloud deployment shall include:
•	Public frontend.
•	Protected application API.
•	Managed PostgreSQL where feasible.
•	Private file storage.
•	HTTPS ingress or reverse proxy.
•	Secure secrets management.
•	Centralized logging and monitoring.
•	Separate backup storage.
Production and staging environments must be separated.
18.2 CI/CD pipeline
GitHub CI shall run:
1.	Code quality and formatting checks.
2.	Unit and integration tests.
3.	Database migration tests.
4.	Dependency and secret scanning.
5.	Container image builds and security scans.
6.	Staging deployment.
7.	End-to-end acceptance tests.
8.	Approved production deployment.
9.	Health checks and smoke tests.
Production migrations must be reviewed, tested, and designed for safe rollout. Backups and rollback procedures must be documented.
19. Implementation Plan
Phase 1 — Discovery and UI design
•	Validate workflows and policies.
•	Finalize wireframes, schema and API contracts.
•	Confirm payment and fulfillment decisions.
Phase 2 — Foundation and public website
•	Implement authentication and permissions.
•	Build branded pages, content management and public catalog.
•	Implement inquiry and quotation workflows.
Phase 3 — Core inventory
•	Implement products, units, branches and warehouses.
•	Implement receipts, issues, counts and weighted-average costing.
•	Implement inventory reports.
Phase 4 — Transfers and procurement
•	Implement transfer approvals, dispatch, receipt and discrepancies.
•	Implement suppliers and purchase orders.
•	Implement spreadsheet import and opening stock migration.

Phase 5 — E-commerce
•	Implement carts, checkout, orders and stock reservations.
•	Integrate the selected payment provider.
•	Implement fulfillment, cancellations, returns and refunds.
Phase 6 — Testing and production launch
•	Complete security, performance and acceptance tests.
•	Validate imported data.
•	Train staff and administrators.
•	Deploy to production and verify recovery procedures.
A detailed schedule and budget shall be established after reviewing the existing inventory spreadsheets, payment-provider requirements, hosting choice, and the number of branches and users.
20. Deliverables
The implementation contract shall require:
•	Complete source code and repository access.
•	Responsive public website and administration dashboard.
•	E-commerce and inventory modules.
•	Database schema and migration scripts.
•	API documentation.
•	Spreadsheet import templates and validation reports.
•	Automated test suites and results.
•	GitHub CI/CD pipeline and deployment configuration.
•	Production setup and security checklist.
•	Backup and recovery documentation.
•	User and administrator manuals.
•	Training and handover.
•	Defined warranty and support terms.
21. Outstanding Decisions
The main business decisions have been confirmed. The following implementation details still require approval:
1.	Payment provider: Confirm Telebirr or another provider, supported payment methods, refund capabilities, and provider fees. => Payments should perform with Manual transfer and in hand Cash
2.	Delivery policy: Confirm delivery coverage, charges, branch collection rules and whether third-party delivery integration is required. => Decides with phone call agreements
3.	Taxes and invoices: Confirm applicable tax calculations, invoice formats, and business accounting requirements with the responsible accountant. 
4.	Order fulfillment: Confirm whether an order may be fulfilled from multiple branches or must be fulfilled from one selected location. => Orders should be fulfilled from the available branches of the company
5.	Reservation timing: Confirm when stock is reserved and how long unpaid orders remain pending. => If they pay an advance payment as soon as the order is placed, the reservation must be revoked.
6.	Transfer approvals: Define approval thresholds and permitted approver roles.=> Branch managers request the transfer, and the system admin or owner approves the transfer.
7.	Costing policy: Confirm the treatment of freight, discounts, returns and other landed costs. => Discounts and other policies should be configurable by the System admin and displayed on the stock as badge by following the brand of the company.
8.	Spreadsheet migration: Approve the data template, initial stock cutoff date and reconciliation procedure. To be decided later,
9.	Hosting and recovery: Approve the hosting budget, recovery targets and operational support arrangements.
10.	Product pricing: Confirm which products have fixed prices and which require quotation-based pricing. => this Should be configurable
These decisions must be resolved before the affected functionality is finalized for production.
22. Final Conclusion
Aser Trading should implement one integrated platform with a public marketing website, online sales capabilities, and a secure, multi-branch inventory management system.
The core design should prioritize inventory accuracy, weighted-average costing, stock reservation, controlled transfers, secure payment processing, and auditable business transactions.
The recommended Angular/TypeScript, Spring Boot, and PostgreSQL modular-monolith architecture provides a maintainable foundation for the first release while allowing future expansion into accounting, manufacturing, advanced analytics, and external integrations.

