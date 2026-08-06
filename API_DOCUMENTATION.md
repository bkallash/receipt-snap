# 🧾 ReceiptSnap — API Documentation (V1)

Welcome to the **ReceiptSnap REST API V1** documentation. ReceiptSnap provides enterprise-grade, multi-tenant receipt capture, expense management, AI metadata extraction, department/category budgeting, and automated policy enforcement workflows.

For complete developer architecture, environment variable setup, and system configuration details, see the [Developer & API Guide](file:///d:/code%20Projects/Laravel/receipt-snap/DEVELOPER_GUIDE.md).

---

## 🌐 Base URL & Versioning

All API requests are versioned and served under the `/api/v1` prefix:

```http
http://localhost:8000/api/v1
```

---

## 🔑 Authentication & Multi-Tenancy Strategy

ReceiptSnap uses **Laravel Sanctum Bearer Tokens** for API authentication.

### Headers Required for Authenticated Endpoints
```http
Authorization: Bearer <your_sanctum_token>
Accept: application/json
Content-Type: application/json
```

### Hybrid Multi-Tenancy Architecture
- **Token Ability Scoping**: Sanctum tokens are scoped to a specific tenant using the ability format `org:{organization_id}`.
- **Automatic Organization Context**: The `SetOrganizationContext` middleware automatically reads the tenant ability from your token and isolates data queries to that organization.
- **Switching Context**: To switch working context to another organization, call `POST /auth/switch-organization/{organization}` to acquire a newly scoped Bearer token.

---

## 🚦 Standard Error Schemas & Status Codes

| Status Code | Description |
|---|---|
| `200 OK` | Request succeeded. |
| `201 Created` | Resource created successfully. |
| `202 Accepted` | Async processing job queued. |
| `400 Bad Request` | Request parameters are malformed or invalid. |
| `401 Unauthorized` | Missing, invalid, or expired Bearer token. |
| `403 Forbidden` | Authenticated user lacks permission or required role (`owner`/`admin`). |
| `404 Not Found` | Requested resource or endpoint does not exist. |
| `422 Unprocessable Content` | Validation failed for one or more fields. |
| `429 Too Many Requests` | Rate limit or AI monthly scan quota exceeded. |
| `500 Internal Server Error` | Unexpected server error. |

### Validation Error Response (`422 Unprocessable Content`)
```json
{
  "message": "The expense_date field is required. (and 1 more error)",
  "errors": {
    "expense_date": [
      "The expense_date field is required."
    ],
    "amount": [
      "The amount field must be at least 0.01."
    ]
  }
}
```

### Unauthorized Error Response (`401 Unauthorized`)
```json
{
  "message": "Unauthenticated."
}
```

### Forbidden Error Response (`403 Forbidden`)
```json
{
  "message": "This action is unauthorized."
}
```

### Quota Exceeded Response (`429 Too Many Requests`)
```json
{
  "message": "Monthly AI receipt scan quota exceeded for this organization."
}
```

---

## 🛡️ Idempotency & Rate Limiting

- **Rate Limits**: Public auth endpoints (`/auth/register`, `/auth/login`) are rate-limited to **6 requests per minute**.
- **Idempotency Header**: State-mutating requests (`POST`, `PUT`, `DELETE`) accept an optional `X-Idempotency-Key` header with a unique UUID to prevent double submissions:
  ```http
  X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
  ```

---

## 📚 Endpoint Reference Table

| Category | Endpoint | Method | Auth | Description |
|---|---|---|---|---|
| **Auth** | `/auth/register` | `POST` | Public | Register user & organization |
| **Auth** | `/auth/login` | `POST` | Public | Authenticate user credentials |
| **Auth** | `/auth/user` | `GET` | Bearer | Get authenticated user info |
| **Auth** | `/auth/switch-organization/{id}` | `POST` | Bearer | Switch tenant organization context |
| **Auth** | `/auth/logout` | `POST` | Bearer | Revoke Sanctum API token |
| **Organizations** | `/organizations` | `GET/POST` | Bearer | List or create organizations |
| **Organizations** | `/organizations/{id}` | `GET/PUT` | Bearer | Get or update organization |
| **Members** | `/organizations/{org}/members` | `GET` | Bearer | List organization members |
| **Members** | `/organizations/{org}/members/{member}` | `PUT/DELETE` | Bearer | Update role or remove member |
| **Invitations** | `/organizations/{org}/invitations` | `POST` | Bearer | Invite member by email |
| **Invitations** | `/invitations/{token}/accept` | `POST` | Bearer | Accept email invitation |
| **Departments** | `/departments` | `GET/POST` | Bearer | List or create departments |
| **Departments** | `/departments/{id}` | `GET/PUT/DEL` | Bearer | Get, update, or delete department |
| **Departments** | `/departments/{id}/budget-status` | `GET` | Bearer | Get department budget metrics |
| **Categories** | `/categories` | `GET/POST` | Bearer | List or create expense categories |
| **Categories** | `/categories/{id}` | `GET/PUT/DEL` | Bearer | Get, update, or delete category |
| **Categories** | `/categories/{id}/budget-status` | `GET` | Bearer | Get category budget metrics |
| **Expenses** | `/expenses` | `GET/POST` | Bearer | List or create expenses |
| **Expenses** | `/expenses/{id}` | `GET/PUT/DEL` | Bearer | Get, update, or delete expense |
| **Expenses** | `/expenses/{id}/submit` | `POST` | Bearer | Submit draft expense |
| **Expenses** | `/expenses/{id}/approve` | `POST` | Bearer | Approve expense (Manager/Admin) |
| **Expenses** | `/expenses/{id}/reject` | `POST` | Bearer | Reject expense (Manager/Admin) |
| **Expenses** | `/expenses/{id}/admin-correct` | `PUT` | Bearer | Admin correction on expense data |
| **Receipt Scanning** | `/expenses/{id}/scan` | `POST` | Bearer | Upload image & start AI scan |
| **Receipt Scanning** | `/expenses/{id}/scan-status` | `GET` | Bearer | Poll AI extraction status |
| **Receipt Scanning** | `/expenses/{id}/scan/retry` | `POST` | Bearer | Retry failed AI scan |
| **Reimbursements** | `/reimbursement-batches` | `GET/POST` | Bearer | List or create reimbursement batches |
| **Reimbursements** | `/reimbursement-batches/{id}` | `GET` | Bearer | View reimbursement batch details |
| **Reimbursements** | `/reimbursement-batches/{id}/execute` | `POST` | Bearer | Mark batch as completed/executed |
| **Reimbursements** | `/reimbursement-batches/{id}/bank-file` | `GET` | Bearer | Download NACHA/CSV bank payout file |
| **Reimbursements** | `/reimbursements/mark-reimbursed` | `POST` | Bearer | Mark individual approved expenses as reimbursed |
| **Accounting Exports** | `/accountant/export-erp` | `GET` | Bearer | Export transactions in CSV, QuickBooks, or Xero format |
| **Accounting Exports** | `/accountant/download-compliance-package` | `GET` | Bearer | Download audit-ready compliance ZIP package |
| **Audit Logs** | `/audit-logs` | `GET` | Bearer | List immutable audit log entries |
| **Audit Logs** | `/audit-logs/{uuid}` | `GET` | Bearer | Get specific audit log entry by UUID |
| **Aggregates** | `/aggregates` | `GET` | Bearer | List pre-computed performance aggregates |
| **Aggregates** | `/aggregates/summary` | `GET` | Bearer | Get organization aggregate summary metrics |

---

## 1. Authentication (`/api/v1/auth`)

### 1.1 Register User & Organization
Creates a new user account, initializes a default organization, and returns a Sanctum API token.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/auth/register`
- **Rate Limit**: 6 requests / min
- **Authentication**: None (Public)

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `name` | `string` | Required, max 255 | User full name |
| `email` | `string` | Required, email, max 255, unique | Account email address |
| `password` | `string` | Required, min 8 chars | Account password |
| `password_confirmation` | `string` | Required | Password confirmation matching `password` |
| `organization_name` | `string` | Required, max 255 | Primary organization name |

#### Response (`201 Created`)
```json
{
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@acme.com",
    "organizations": [
      {
        "id": 1,
        "name": "Acme Corp",
        "slug": "acme-corp",
        "role": "owner"
      }
    ]
  },
  "organization_id": 1,
  "token": "1|sanctumtokenhash..."
}
```

---

### 1.2 Login
Authenticates user credentials and returns a Bearer token scoped to the user's active organization.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Rate Limit**: 6 requests / min
- **Authentication**: None (Public)

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `email` | `string` | Required, email | Registered user email |
| `password` | `string` | Required | User password |
| `organization_id` | `integer` | Optional | Target organization ID to log into |

#### Response (`200 OK`)
```json
{
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@acme.com"
  },
  "current_organization_id": 1,
  "token": "2|sanctumtokenhash..."
}
```

---

### 1.3 Get Current User Info
Returns profile details and joined organization list for the currently authenticated user.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/auth/user`
- **Authentication**: Bearer Token

#### Response (`200 OK`)
```json
{
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@acme.com",
    "organizations": [
      {
        "id": 1,
        "name": "Acme Corp",
        "slug": "acme-corp",
        "role": "owner"
      }
    ]
  },
  "current_organization_id": 1
}
```

---

### 1.4 Switch Organization Context
Issues a new Sanctum token scoped to the target organization ID.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/auth/switch-organization/{organization}`
- **Authentication**: Bearer Token

#### Response (`200 OK`)
```json
{
  "message": "Switched organization successfully.",
  "organization_id": 2,
  "token": "3|sanctumtokenhash..."
}
```

---

### 1.5 Logout
Revokes the current Sanctum token.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/auth/logout`
- **Authentication**: Bearer Token

#### Response (`200 OK`)
```json
{
  "message": "Logged out successfully."
}
```

---

## 2. Organization & Member Management (`/api/v1/organizations`)

### 2.1 Create Organization
- **HTTP Method**: `POST`
- **Path**: `/api/v1/organizations`
- **Authentication**: Bearer Token

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `name` | `string` | Required, max 255 | Organization name |

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 2,
    "name": "Beta Labs",
    "slug": "beta-labs",
    "created_at": "2026-07-31T19:40:00Z"
  }
}
```

---

### 2.2 List Members
- **HTTP Method**: `GET`
- **Path**: `/api/v1/organizations/{org}/members`
- **Authentication**: Bearer Token (`owner` or `admin` role)

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "Jane Doe",
      "email": "jane@acme.com",
      "role": "owner",
      "joined_at": "2026-07-01T10:00:00Z"
    }
  ]
}
```

---

### 2.3 Invite Member
- **HTTP Method**: `POST`
- **Path**: `/api/v1/organizations/{org}/invitations`
- **Authentication**: Bearer Token (`owner` or `admin` role)

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `email` | `string` | Required, email, max 255 | Recipient email address |
| `role` | `string` | Required, enum: `admin`, `member` | Assigned role |
| `department_id` | `integer` | Optional, exists:departments,id | Target department ID |

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 5,
    "email": "alex@acme.com",
    "role": "member",
    "token": "inv_token_987654",
    "expires_at": "2026-08-07T19:40:00Z"
  }
}
```

---

## 3. Departments & Budgets (`/api/v1/departments`)

### 3.1 Create Department
- **HTTP Method**: `POST`
- **Path**: `/api/v1/departments`
- **Authentication**: Bearer Token (`owner` or `admin` role)

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `name` | `string` | Required, max 255, unique per org | Department name |
| `description` | `string` | Optional, max 1000 | Description |
| `budget_amount` | `number` | Optional, min 0, max 9999999999.99 | Total budget limit |
| `budget_currency` | `string` | Required with `budget_amount`, ISO currency code | Currency (e.g. `USD`) |
| `budget_period` | `string` | Required with `budget_amount`, enum: `monthly`, `quarterly`, `annual` | Budget cycle period |

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 1,
    "name": "Engineering",
    "description": "Software Development Department",
    "budget_amount": "10000.00",
    "budget_currency": "USD",
    "budget_period": "monthly",
    "created_at": "2026-07-31T19:40:00Z"
  }
}
```

---

### 3.2 Get Department Budget Status
Returns real-time budget utilization metrics for a department.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/departments/{department}/budget-status`
- **Authentication**: Bearer Token

#### Response (`200 OK`)
```json
{
  "department_id": 1,
  "department_name": "Engineering",
  "budget_amount": "10000.00",
  "budget_currency": "USD",
  "budget_period": "monthly",
  "total_spent": "3450.00",
  "remaining_budget": "6550.00",
  "utilization_percentage": 34.5,
  "is_over_budget": false
}
```

---

## 4. Expense Categories & Budgets (`/api/v1/categories`)

### 4.1 Create Expense Category
- **HTTP Method**: `POST`
- **Path**: `/api/v1/categories`
- **Authentication**: Bearer Token (`owner` or `admin` role)

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `name` | `string` | Required, max 255, unique per org | Category name |
| `description` | `string` | Optional, max 1000 | Description |
| `icon` | `string` | Optional, max 100 | Icon string |
| `color` | `string` | Optional, hex color code (e.g. `#FF5733`) | Color tag |
| `max_amount` | `number` | Optional, max single transaction amount limit | Max allowed limit per expense |
| `budget_amount` | `number` | Optional, min 0 | Total category budget limit |
| `budget_currency` | `string` | Required with `budget_amount`, size 3 | Currency code |
| `budget_period` | `string` | Required with `budget_amount`, enum: `monthly`, `quarterly`, `annual` | Budget cycle period |

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 3,
    "name": "Software & Subscriptions",
    "color": "#3B82F6",
    "budget_amount": "2500.00",
    "budget_currency": "USD",
    "budget_period": "monthly"
  }
}
```

---

### 4.2 Get Category Budget Status
- **HTTP Method**: `GET`
- **Path**: `/api/v1/categories/{category}/budget-status`
- **Authentication**: Bearer Token

#### Response (`200 OK`)
```json
{
  "category_id": 3,
  "category_name": "Software & Subscriptions",
  "budget_amount": "2500.00",
  "budget_currency": "USD",
  "budget_period": "monthly",
  "total_spent": "1800.00",
  "remaining_budget": "700.00",
  "utilization_percentage": 72.0,
  "is_over_budget": false
}
```

---

## 5. Expenses & Workflow Actions (`/api/v1/expenses`)

### 5.1 Create Draft Expense
- **HTTP Method**: `POST`
- **Path**: `/api/v1/expenses`
- **Authentication**: Bearer Token

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `amount` | `number` | Required, min 0.01, max 999999.99 | Total expense amount |
| `currency_code` | `string` | Required, ISO 3-letter currency | Currency (e.g. `USD`) |
| `expense_date` | `string` | Required, date, before_or_equal:today | Expense transaction date (`YYYY-MM-DD`) |
| `merchant_name` | `string` | Optional, max 255 | Merchant / Vendor name |
| `description` | `string` | Optional, max 2000 | Notes or business purpose |
| `expense_category_id`| `integer` | Optional, exists:expense_categories,id | Category ID |
| `payment_method` | `string` | Optional, enum: `cash`, `card`, `transfer` | Payment method used |
| `tax_amount` | `number` | Optional, min 0 | Tax portion |
| `tip_amount` | `number` | Optional, min 0 | Tip portion |
| `line_items` | `array` | Optional array of line items | Detailed breakdown |
| `line_items.*.description`| `string` | Required with `line_items` | Line item description |
| `line_items.*.quantity` | `number` | Required with `line_items`, min 0.001 | Item quantity |
| `line_items.*.unit_price` | `number` | Required with `line_items`, min 0 | Unit price |

#### Response (`201 Created`)
```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "merchant_name": "GitHub Inc",
    "description": "Team Copilot Subscription",
    "amount": "120.00",
    "tax_amount": "0.00",
    "tip_amount": "0.00",
    "currency_code": "USD",
    "expense_date": "2026-07-30",
    "payment_method": "card",
    "status": "draft",
    "policy_flags": [
      {
        "type": "MISSING_RECEIPT",
        "severity": "warning",
        "message": "Receipt image required for expenses exceeding $25.00."
      }
    ],
    "created_at": "2026-07-31T19:42:00Z"
  }
}
```

---

### 5.2 Submit Expense
Submits a draft expense for manager approval. Evaluates automated policy rules.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/expenses/{expense}/submit`
- **Authentication**: Bearer Token

#### Response (`200 OK`)
```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "submitted",
    "submitted_at": "2026-07-31T19:43:00Z",
    "policy_flags": []
  }
}
```

---

### 5.3 Approve Expense
Approves a submitted expense.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/expenses/{expense}/approve`
- **Authentication**: Bearer Token (`owner` or `admin` role)

#### Response (`200 OK`)
```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "approved",
    "approved_at": "2026-07-31T19:44:00Z"
  }
}
```

---

### 5.4 Reject Expense
Rejects a submitted expense with a required rejection reason.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/expenses/{expense}/reject`
- **Authentication**: Bearer Token (`owner` or `admin` role)

#### Request Body (`application/json`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `reason` | `string` | Required, min 3, max 1000 | Explanation for rejection |

#### Response (`200 OK`)
```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "rejected",
    "rejection_reason": "Receipt image missing and item description unclear.",
    "rejected_at": "2026-07-31T19:45:00Z"
  }
}
```

---

## 6. Receipt Scanning & AI Operations (`/api/v1/expenses/{id}/*`)

### 6.1 Upload & Scan Receipt Image
Uploads a physical receipt file and dispatches an asynchronous AI vision OCR scan.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/expenses/{expense}/scan`
- **Authentication**: Bearer Token (subject to monthly AI quota)
- **Headers**: `Content-Type: multipart/form-data`

#### Request Body (`multipart/form-data`)
| Field | Type | Rules | Description |
|---|---|---|---|
| `receipt_image` | `file` | Required, mimes: `jpg,jpeg,png,pdf,heic`, max 10MB | Physical receipt document |

#### Response (`202 Accepted`)
```json
{
  "message": "Receipt uploaded successfully. AI OCR extraction queued.",
  "job_id": "job_ocr_99887766",
  "status": "processing"
}
```

---

### 6.2 Get AI Scan Status
Polls the extraction status and extracted metadata attributes.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/expenses/{expense}/scan-status`
- **Authentication**: Bearer Token

#### Response (`200 OK`)
```json
{
  "status": "completed",
  "confidence_score": 94.5,
  "extracted_data": {
    "merchant_name": "Uber Tech Inc",
    "expense_date": "2026-07-29",
    "amount": "45.20",
    "tax_amount": "3.50",
    "currency_code": "USD",
    "line_items": [
      {
        "description": "UberX Trip",
        "quantity": 1,
        "unit_price": 41.70
      }
    ]
  }
}
```

---

## 7. Audit Logs (`/api/v1/audit-logs`)

### 7.1 List Audit Logs
Returns a paginated list of immutable audit log entries for the organization.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/audit-logs`
- **Authentication**: Bearer Token (`owner`, `admin`, `manager`, or `accountant` role)
- **Query Parameters**:
  - `action`: Filter by AuditAction enum value (e.g. `expense.created`, `expense.approved`)
  - `auditable_type`: Filter by entity class name (e.g. `Expense`)
  - `auditable_id`: Filter by entity primary key
  - `actor_id`: Filter by actor user ID
  - `from`: Filter records created on or after date (`YYYY-MM-DD`)
  - `to`: Filter records created on or before date (`YYYY-MM-DD`)

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 1,
      "uuid": "8f7e6d5c-4b3a-2109-8765-43210fedcba9",
      "action": "expense.approved",
      "auditable_type": "Expense",
      "auditable_id": 42,
      "before_state": { "status": "submitted" },
      "after_state": { "status": "approved" },
      "checksum": "a3f5b2c...",
      "is_checksum_valid": true,
      "created_at": "2026-08-03T10:00:00Z"
    }
  ]
}
```

---

### 7.2 Get Audit Log Details
Returns single audit log entry by UUID.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/audit-logs/{uuid}`
- **Authentication**: Bearer Token (`owner`, `admin`, `manager`, or `accountant` role)

---

## 8. Pre-computed Aggregates (`/api/v1/aggregates`)

### 8.1 List Aggregates
Returns paginated pre-computed performance aggregates.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/aggregates`
- **Authentication**: Bearer Token (`owner`, `admin`, `manager`, or `accountant` role)
- **Query Parameters**:
  - `type`: `organization`, `department`, or `category`
  - `period`: `monthly`, `quarterly`, or `annual`
  - `aggregate_id`: Department or Category ID
  - `from`: Start date filter (`YYYY-MM-DD`)
  - `to`: End date filter (`YYYY-MM-DD`)

---

### 8.2 Get Dashboard Aggregates Summary
Returns pre-computed organization summary, department breakdown, and category breakdown for dashboard rendering.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/aggregates/summary`
- **Authentication**: Bearer Token (`owner`, `admin`, `manager`, or `accountant` role)
- **Query Parameters**:
  - `period`: `monthly` (default), `quarterly`, or `annual`
  - `date`: As-of date (`YYYY-MM-DD`, defaults to today)

#### Response (`200 OK`)
```json
{
  "period": "monthly",
  "period_start": "2026-08-01",
  "organization_summary": {
    "total_count": 150,
    "approved_count": 120,
    "pending_count": 20,
    "rejected_count": 10,
    "approved_amount": 14500.00,
    "pending_amount": 2300.00,
    "flagged_count": 3
  },
  "department_breakdown": [],
  "category_breakdown": []
}
```

---

## 9. Reimbursements & Payout Batches (`/api/v1/reimbursement-batches`)

### 9.1 List Reimbursement Batches
Returns a paginated list of payout batches.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/reimbursement-batches`
- **Authentication**: Bearer Token (`owner`, `admin`, or `accountant` role)

---

### 9.2 Create Reimbursement Batch
Groups approved expenses into a payout batch.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/reimbursement-batches`
- **Authentication**: Bearer Token (`owner`, `admin`, or `accountant` role)
- **Request Body**:
  - `expense_ids`: `array` of integers (required)
  - `payment_method`: `string` (`ach`, `check`, `payroll`, `wire`)
  - `notes`: `string` (optional)

---

### 9.3 Execute Batch Payout
Marks a reimbursement batch as executed and transitions associated expenses to `reimbursed`.

- **HTTP Method**: `POST`
- **Path**: `/api/v1/reimbursement-batches/{batch}/execute`
- **Authentication**: Bearer Token (`owner`, `admin`, or `accountant` role)

---

### 9.4 Download Bank Payout File
Generates and downloads bank-ready payout files (CSV / NACHA format).

- **HTTP Method**: `GET`
- **Path**: `/api/v1/reimbursement-batches/{batch}/bank-file`
- **Authentication**: Bearer Token (`owner`, `admin`, or `accountant` role)

---

## 10. Accounting & ERP Exports (`/api/v1/accountant`)

### 10.1 Export ERP Data
Downloads transaction data formatted for accounting software.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/accountant/export-erp`
- **Authentication**: Bearer Token (`owner`, `admin`, or `accountant` role)
- **Query Parameters**:
  - `format`: `csv` (default), `quickbooks`, or `xero`
  - `status`: Filter by status (`approved`, `reimbursed`, `all`)
  - `from`: Start date (`YYYY-MM-DD`)
  - `to`: End date (`YYYY-MM-DD`)

---

### 10.2 Download Compliance ZIP Package
Generates a downloadable ZIP archive containing approved expense records, audit log CSVs, and original uploaded receipt images.

- **HTTP Method**: `GET`
- **Path**: `/api/v1/accountant/download-compliance-package`
- **Authentication**: Bearer Token (`owner`, `admin`, or `accountant` role)
- **Query Parameters**:
  - `from`: Start date (`YYYY-MM-DD`)
  - `to`: End date (`YYYY-MM-DD`)

