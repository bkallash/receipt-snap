# ReceiptFlow — Project Rules & Agent Guidelines (`.agents/AGENTS.md`)

This file defines the project-level rules, coding standards, architectural invariants, and testing guidelines for the **ReceiptFlow** (receipt-snap) Laravel workspace. All agentic AI actions and developer contributions in this codebase MUST adhere strictly to these rules.

---

## 🏛️ 1. Architecture & Multi-Tenancy Rules

### 1.1 Tenant Isolation
- **Sanctum Ability Scoping**: All tenant-scoped Sanctum tokens MUST contain the ability format `org:{organization_id}`.
- **Middleware Scope**: Tenant-isolated API routes MUST pass through `App\Http\Middleware\SetOrganizationContext`.
- **Query Scoping**: Never query domain models (`Expense`, `Department`, `ExpenseCategory`, `OrganizationInvitation`, `OrganizationMember`) without scoping queries to the active `organization_id`.

### 1.2 Idempotency & Rate Limiting
- State-mutating API routes (`POST`, `PUT`, `DELETE`) MUST pass through `App\Http\Middleware\EnsureIdempotency`.
- Public authentication routes (`/auth/register`, `/auth/login`) MUST maintain throttling (`throttle:6,1`).

---

## 💻 2. Code Quality & PHP Standards

### 2.1 Type Safety & Strict Declaration
- Every PHP file MUST include `declare(strict_types=1);` immediately after the opening tag.
- All classes, methods, and functions MUST specify explicit parameter types, return types, and property type hints.

### 2.2 Layered Architecture
- **Controllers (`App\Http\Controllers\Api\V1`)**: Must remain thin. Controllers handle HTTP request validation, call services, and return API Resources. No direct complex DB transactions in controllers.
- **Form Requests (`App\Http\Requests\V1`)**: Every endpoint accepting a request payload MUST use a dedicated `FormRequest` class.
- **API Resources (`App\Http\Resources\V1`)**: Every API response MUST use Laravel API Resources or Resource Collections. Never return raw Eloquent model arrays.
- **Services (`App\Services`)**: Business logic, database transactions (`DB::transaction`), and complex state machine updates MUST reside in dedicated Service classes (`ExpenseService`, `OrganizationService`, `PolicyEnforcementService`).
- **Enums (`App\Enums`)**: Use PHP 8.1 Backed Enums (`ExpenseStatus`, `BudgetPeriod`, `UserRole`, `PaymentMethod`) for string state invariants.

---

## 🛡️ 3. Domain Rules & Automated Policy Engine

### 3.1 Expense Lifecycle
- Expenses transition through valid status states: `Draft` -> `Submitted` -> `Approved` / `Rejected`.
- Rejection action requires a mandatory `reason` string payload.

### 3.2 Automated Policy Engine
- All submitted expenses MUST be evaluated against policy rules (`PolicyEnforcementService`).
- Standard policy flags include:
  - `MISSING_RECEIPT`: Triggered if `amount` > `$25.00` (or `RECEIPT_REQUIRE_THRESHOLD`) without an attached receipt image.
  - `WEEKEND_TRANSACTION`: Triggered if `expense_date` falls on Saturday or Sunday when `RECEIPT_FLAG_WEEKENDS` is enabled.
  - `BUDGET_EXCEEDED`: Triggered if the expense pushes department or category spend over `budget_amount`.
  - `DUPLICATE_RECEIPT`: Triggered if perceptual image hash distance <= 10 (`duplicate_detection.hamming_threshold`) or identical merchant + amount occurs within 30 days.

### 3.3 AI OCR & Circuit Breaker
- Receipt image processing MUST run asynchronously via queue jobs (`ProcessReceiptScan`).
- AI endpoints MUST apply `CheckAiQuota` middleware to enforce monthly organization scan quotas (`quota.free_monthly_limit`).
- Third-party AI service calls MUST be wrapped in circuit breaker checks (`circuit_breaker.failure_threshold`).

---

## 🧪 4. Testing Guidelines

- **Targeted Test Execution**: When running test validation on API endpoints in `receipt-snap`, filter by API test namespaces or target suites (`php artisan test --filter=Api`) to prevent false positives from legacy web view test suites.
- **Multi-Tenant Test Scenarios**: Always include test cases verifying that User A in Org 1 cannot view, update, or delete resources belonging to Org 2 (asserting `403 Forbidden` or `404 Not Found`).

---

## 📖 5. Documentation & Tooling Integrity

- **Documentation Updates**: Whenever adding new API endpoints, configuration parameters, database fields, or background jobs, update both `DEVELOPER_GUIDE.md` and `API_DOCUMENTATION.md` to keep schemas synchronized.
- **Code Style & Linting**: Run `vendor/bin/pint` for code style formatting and `vendor/bin/phpstan` for static analysis before declaring tasks complete.
