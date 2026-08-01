# 🧾 ReceiptFlow — Developer & API Guide

Welcome to the comprehensive developer documentation for **ReceiptFlow** (Receipt Snap). This guide documents the application architecture, system configuration, multi-tenancy model, AI receipt scanning pipeline, automated policy engine, complete REST API reference, and developer onboarding instructions.

---

## 📑 Table of Contents
1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Multi-Tenancy & Security Strategy](#2-multi-tenancy--security-strategy)
3. [System Configuration & Environment Variables](#3-system-configuration--environment-variables)
4. [Automated Policy Engine & Budget Controls](#4-automated-policy-engine--budget-controls)
5. [AI Receipt Scanning & Processing Pipeline](#5-ai-receipt-scanning--processing-pipeline)
6. [Complete REST API Reference (v1)](#6-complete-rest-api-reference-v1)
   - [Authentication & Tenant Context](#61-authentication--tenant-context)
   - [Organization & Member Management](#62-organization--member-management)
   - [Department Management & Budgets](#63-department-management--budgets)
   - [Expense Category Management & Budgets](#64-expense-category-management--budgets)
   - [Expense Management & Workflow Actions](#65-expense-management--workflow-actions)
   - [Receipt Scanning & AI Operations](#66-receipt-scanning--ai-operations)
7. [Developer Setup, Testing & Tooling](#7-developer-setup-testing--tooling)

---

## 1. System Overview & Architecture

ReceiptFlow is built on **Laravel 10+** as an API-first, multi-tenant expense and receipt capture platform.

### Key Domain Entities
- **User**: Authenticated user identity. Can belong to multiple organizations with specific roles (`owner`, `admin`, `member`).
- **Organization**: Primary tenant boundary. All domain models (Expenses, Categories, Departments, Invitations) belong to an Organization.
- **Department**: Organizational subdivision with assigned budget caps (`budget_amount`, `budget_currency`, `budget_period`).
- **ExpenseCategory**: Classification for expenses (e.g., Travel, Software, Meals) with optional budget limits.
- **Expense**: Core expense record tracked through status states (`Draft` -> `Submitted` -> `Approved` / `Rejected`).
- **LineItem**: Itemized breakdown attached to an Expense.
- **Receipt & ReceiptImage**: Physical or digital receipt files uploaded to storage disks with OCR extraction metadata.
- **ApprovalStep**: Immutable workflow audit log recording submission, approval, rejection, or admin correction events.

---

## 2. Multi-Tenancy & Security Strategy

ReceiptFlow uses a **Hybrid Token Ability Scoping** multi-tenancy architecture.

### How Data Isolation Works
1. **Sanctum Token Ability**: Upon login or switching organizations, Sanctum issues a Bearer Token containing the ability `org:{organization_id}`.
2. **`SetOrganizationContext` Middleware**: Runs on all tenant-scoped API routes. It inspects the token ability, validates user membership, and sets the active organization context globally.
3. **Idempotency Guard (`EnsureIdempotency`)**: Inspects state-changing requests (`POST`, `PUT`, `DELETE`) for an optional `X-Idempotency-Key` header to prevent duplicate execution.
4. **Policy Enforcement**: Laravel Policies (`ExpensePolicy`, `DepartmentPolicy`, `ExpenseCategoryPolicy`, `OrganizationPolicy`) enforce role-based access control (`owner`/`admin` vs. `member`).

---

## 3. System Configuration & Environment Variables

The central configuration file is located at `config/receipt-snap.php`.

### Configuration Structure (`config/receipt-snap.php`)

```php
return [
    'storage' => [
        'disk' => env('RECEIPT_STORAGE_DISK', 'local'),
        'path_prefix' => 'receipts',
        'signed_url_ttl' => 15, // Minutes
        'max_file_size' => 10 * 1024 * 1024, // 10MB
    ],

    'default_currency' => env('RECEIPT_DEFAULT_CURRENCY', 'USD'),

    'ai' => [
        'provider' => env('RECEIPT_AI_PROVIDER', 'gemini'),
        'model' => env('RECEIPT_AI_MODEL'),
        'confidence_threshold' => 70.0,
        'max_retries' => 3,
        'retry_backoff' => [10, 20, 40],
    ],

    'circuit_breaker' => [
        'failure_threshold' => 5,
        'recovery_timeout' => 300, // 5 minutes
        'cache_prefix' => 'circuit:ai_receipt',
    ],

    'quota' => [
        'free_monthly_limit' => 50,
        'cache_prefix' => 'ai_quota',
    ],

    'duplicate_detection' => [
        'hamming_threshold' => 10,
        'data_match_window_days' => 30,
    ],

    'policies' => [
        'require_receipt_threshold_amount' => (float) env('RECEIPT_REQUIRE_THRESHOLD', 25.00),
        'flag_weekend_transactions' => (bool) env('RECEIPT_FLAG_WEEKENDS', true),
        'strict_budget_enforcement' => (bool) env('RECEIPT_STRICT_BUDGET', false),
    ],
];
```

### Essential Environment Variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `RECEIPT_STORAGE_DISK` | `local` | Storage disk driver (`local`, `s3`, `public`) |
| `RECEIPT_DEFAULT_CURRENCY` | `USD` | System base reporting currency |
| `RECEIPT_AI_PROVIDER` | `gemini` | AI OCR engine (`gemini`, `openai`) |
| `RECEIPT_AI_MODEL` | `gemini-1.5-flash` | Target model for receipt vision extraction |
| `RECEIPT_REQUIRE_THRESHOLD` | `25.00` | Minimum expense amount requiring receipt upload |
| `RECEIPT_FLAG_WEEKENDS` | `true` | Auto-flag transactions made on Saturday/Sunday |
| `RECEIPT_STRICT_BUDGET` | `false` | Block expense submission if department/category budget is exceeded |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:3000` | Allowed stateful web domains |

---

## 4. Automated Policy Engine & Budget Controls

### Budget Tracking Engine
Departments and Expense Categories support optional budget limits with configurable periods:
- **`Monthly`**: Resets at the 1st of every calendar month.
- **`Quarterly`**: Tracks spend within Q1, Q2, Q3, Q4.
- **`Annual`**: Tracks cumulative spend for the calendar year.

Endpoints:
- `GET /api/v1/departments/{id}/budget-status`
- `GET /api/v1/categories/{id}/budget-status`

### Automated Policy Violations
When an expense is evaluated, the system detects and flags policy warnings:
1. **`MISSING_RECEIPT`**: Amount exceeds `$25.00` threshold without an attached receipt image.
2. **`WEEKEND_TRANSACTION`**: Expense date falls on Saturday or Sunday.
3. **`BUDGET_EXCEEDED`**: Department or Category budget cap exceeded.
4. **`DUPLICATE_RECEIPT`**: Duplicate image detected via perceptual hash (Hamming distance <= 10) or identical merchant + amount within 30 days.

---

## 5. AI Receipt Scanning & Processing Pipeline

1. **Upload & Queueing**: Calling `POST /api/v1/expenses/{expense}/scan` uploads the image file and dispatches `ProcessReceiptScan` job to the queue.
2. **Quota Verification**: `CheckAiQuota` middleware checks the organization's monthly AI scan usage against `quota.free_monthly_limit`.
3. **Circuit Breaker**: If third-party AI requests fail repeatedly (>= 5 consecutive failures), the circuit breaker opens for 5 minutes (`recovery_timeout`), failing fast without draining system resources.
4. **Data Extraction & Auto-Population**: Merchant name, expense date, total amount, tax, tip, currency, and line items are automatically extracted and merged onto the expense record.

---

## 6. Complete REST API Reference (v1)

Base URL: `http://localhost:8000/api/v1`  
Default Headers:
```http
Authorization: Bearer <sanctum_token>
Accept: application/json
Content-Type: application/json
```

### 6.1 Authentication & Tenant Context

#### `POST /auth/register`
Public. Creates a user, organization, and returns Sanctum token.
- **Body**: `name`, `email`, `password`, `password_confirmation`, `organization_name`
- **Response**: `201 Created` (`user`, `organization`, `token`)

#### `POST /auth/login`
Public. Authenticates credentials and returns token.
- **Body**: `email`, `password`, `organization_id` (optional)
- **Response**: `200 OK` (`user`, `organization_id`, `token`)

#### `GET /auth/user`
Auth Required. Returns authenticated user profile and organization memberships.
- **Response**: `200 OK` (`user`, `current_organization_id`)

#### `POST /auth/switch-organization/{organization}`
Auth Required. Re-issues token scoped to the target organization ID.
- **Response**: `200 OK` (`message`, `organization_id`, `token`)

#### `POST /auth/logout`
Auth Required. Revokes current Sanctum token.
- **Response**: `200 OK` (`message`)

---

### 6.2 Organization & Member Management

#### `GET /organizations` | `POST /organizations` | `GET /organizations/{id}` | `PUT /organizations/{id}`
Organization management resource endpoints.

#### `GET /organizations/{org}/members`
List members in current organization.

#### `PUT /organizations/{org}/members/{member}`
Update member role (`owner`, `admin`, `member`).

#### `DELETE /organizations/{org}/members/{member}`
Remove member from organization.

#### `POST /organizations/{org}/invitations`
Send tenant invitation email.

#### `POST /invitations/{token}/accept`
Accept invitation token and join organization.

---

### 6.3 Department Management & Budgets

#### `GET /departments` | `POST /departments` | `GET /departments/{id}` | `PUT /departments/{id}` | `DELETE /departments/{id}`
Standard CRUD for organizational departments.
- **Fields**: `name`, `code`, `budget_amount`, `budget_currency`, `budget_period` (`monthly`, `quarterly`, `annual`).

#### `GET /departments/{department}/budget-status`
Returns live budget consumption analytics for the department.
- **Response Example**:
```json
{
  "department_id": 1,
  "budget_amount": "5000.00",
  "budget_period": "monthly",
  "total_spent": "1420.50",
  "remaining_budget": "3579.50",
  "utilization_percentage": 28.41,
  "is_over_budget": false
}
```

---

### 6.4 Expense Category Management & Budgets

#### `GET /categories` | `POST /categories` | `GET /categories/{id}` | `PUT /categories/{id}` | `DELETE /categories/{id}`
Standard CRUD for expense categories.
- **Fields**: `name`, `code`, `description`, `budget_amount`, `budget_currency`, `budget_period`.

#### `GET /categories/{category}/budget-status`
Returns live budget consumption analytics for the category.

---

### 6.5 Expense Management & Workflow Actions

#### `GET /expenses`
List expenses in active organization. Supports filtering by `status`, `category_id`, `department_id`, and `date_range`.

#### `POST /expenses`
Create new draft expense.
- **Fields**: `amount`, `currency_code`, `expense_date`, `merchant_name`, `expense_category_id`, `department_id`, `line_items` (array).

#### `GET /expenses/{id}`
Get detailed expense view including line items, receipt images, policy warnings, and audit steps.

#### `PUT /expenses/{id}`
Update draft expense details.

#### `DELETE /expenses/{id}`
Delete expense item.

#### `POST /expenses/{id}/submit`
Transitions expense status from `Draft` -> `Submitted`. Triggers policy enforcement checks.

#### `POST /expenses/{id}/approve`
Requires Manager/Admin role. Transitions status from `Submitted` -> `Approved`.

#### `POST /expenses/{id}/reject`
Requires Manager/Admin role. Transitions status from `Submitted` -> `Rejected`.
- **Body**: `reason` (string, required).

#### `PUT /expenses/{id}/admin-correct`
Requires Admin role. Allows correcting approved/submitted expense amounts with an immutable audit log entry.

---

### 6.6 Receipt Scanning & AI Operations

#### `POST /expenses/{id}/scan`
Multipart form upload. Uploads receipt image and triggers background AI OCR scan.
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: `receipt_image` (file, max 10MB)
- **Response**: `202 Accepted` (`message`, `job_id`, `status: processing`)

#### `GET /expenses/{id}/scan-status`
Poll scan status. Returns extraction status, confidence scores, and extracted attributes.

#### `POST /expenses/{id}/scan/retry`
Re-queues AI OCR processing in case of transient failures or low confidence score.

---

## 7. Developer Setup, Testing & Tooling

### Local Setup
```bash
# Install PHP dependencies
composer install

# Environment configuration
cp .env.example .env
php artisan key:generate

# Run migrations and database seeders
php artisan migrate --seed

# Start development server
php artisan serve
```

### Running Test Suites
```bash
# Run all feature and unit tests
php artisan test

# Run API-specific test suites
php artisan test --filter=Api
```

### Static Analysis & Code Style
```bash
# Code formatting with Laravel Pint
vendor/bin/pint

# Static analysis with PHPStan
vendor/bin/phpstan analyse
```
