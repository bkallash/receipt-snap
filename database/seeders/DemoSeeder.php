<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\BudgetPeriod;
use App\Enums\ExpenseStatus;
use App\Enums\InvitationStatus;
use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Super Admin User
        $superAdmin = User::updateOrCreate(
            ['email' => 'qwe@qwe.qwe'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('qwerqwer'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Create Primary Organization: Acme Corp
        $acme = Organization::updateOrCreate(
            ['slug' => 'acme-corp'],
            [
                'name' => 'Acme Corporation',
                'plan_tier' => 'pro',
            ]
        );

        // 3. Create Secondary Organization: Globex Financial
        $globex = Organization::updateOrCreate(
            ['slug' => 'globex-financial'],
            [
                'name' => 'Globex Financial',
                'plan_tier' => 'enterprise',
            ]
        );

        // Attach superAdmin to both orgs as Owner
        $superAdmin->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Owner->value, 'is_active' => true, 'joined_at' => now()],
            $globex->id => ['role' => UserRole::Owner->value, 'is_active' => true, 'joined_at' => now()],
        ]);

        TenantContext::set($acme->id);

        // 4. Seed Departments for Acme Corp with Budgets
        $engDept = Department::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Engineering'],
            [
                'description' => 'Software engineering, infrastructure, and product development',
                'budget_amount' => 50000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
            ]
        );

        $salesDept = Department::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Global Sales'],
            [
                'description' => 'Enterprise sales, strategic partnerships, and account management',
                'budget_amount' => 35000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
            ]
        );

        $marketingDept = Department::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Marketing & Growth'],
            [
                'description' => 'Brand strategy, digital advertising, and customer acquisition',
                'budget_amount' => 20000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
            ]
        );

        $execDept = Department::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Executive & Operations'],
            [
                'description' => 'Executive management, finance, legal, and operational support',
                'budget_amount' => 15000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
            ]
        );

        // 5. Seed Users for Acme Corp (Admin, Managers, Finance, Employees)
        $admin = User::updateOrCreate(
            ['email' => 'admin@acme.com'],
            [
                'name' => 'Arthur Pendelton (Admin)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $engManager = User::updateOrCreate(
            ['email' => 'manager@acme.com'],
            [
                'name' => 'Sarah Jenkins (Eng Manager)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $salesManager = User::updateOrCreate(
            ['email' => 'sales.manager@acme.com'],
            [
                'name' => 'David Vance (Sales Manager)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $financeUser = User::updateOrCreate(
            ['email' => 'finance@acme.com'],
            [
                'name' => 'Fiona Carter (Finance Controller)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $employee1 = User::updateOrCreate(
            ['email' => 'employee@acme.com'],
            [
                'name' => 'Alex Rivera (Senior Engineer)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $employee2 = User::updateOrCreate(
            ['email' => 'employee2@acme.com'],
            [
                'name' => 'Marcus Chen (Sales Executive)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $employee3 = User::updateOrCreate(
            ['email' => 'employee3@acme.com'],
            [
                'name' => 'Emily Watson (Marketing Specialist)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Unattached user account with pending invitation
        User::updateOrCreate(
            ['email' => 'pending.employee@acme.com'],
            [
                'name' => 'Jordan Lee (Pending Joiner)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Attach users to Acme Corp organization with roles and departments
        $admin->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Admin->value, 'department_id' => $execDept->id, 'is_active' => true, 'joined_at' => now()],
        ]);

        $engManager->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Manager->value, 'department_id' => $engDept->id, 'is_active' => true, 'joined_at' => now()],
        ]);

        $salesManager->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Manager->value, 'department_id' => $salesDept->id, 'is_active' => true, 'joined_at' => now()],
        ]);

        $financeUser->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Accountant->value, 'department_id' => $execDept->id, 'is_active' => true, 'joined_at' => now()],
        ]);

        $employee1->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Employee->value, 'department_id' => $engDept->id, 'is_active' => true, 'joined_at' => now()],
        ]);

        $employee2->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Employee->value, 'department_id' => $salesDept->id, 'is_active' => true, 'joined_at' => now()],
        ]);

        $employee3->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Employee->value, 'department_id' => $marketingDept->id, 'is_active' => true, 'joined_at' => now()],
        ]);

        // 6. Seed Pending Invitations (employees who have not yet accepted invitations)
        $invitations = [
            [
                'email' => 'pending.employee@acme.com',
                'role' => UserRole::Employee,
                'department_id' => $engDept->id,
                'invited_by_user_id' => $admin->id,
            ],
            [
                'email' => 'pending.marketing@acme.com',
                'role' => UserRole::Employee,
                'department_id' => $marketingDept->id,
                'invited_by_user_id' => $admin->id,
            ],
            [
                'email' => 'pending.manager@acme.com',
                'role' => UserRole::Manager,
                'department_id' => $salesDept->id,
                'invited_by_user_id' => $salesManager->id,
            ],
        ];

        foreach ($invitations as $inv) {
            OrganizationInvitation::updateOrCreate(
                [
                    'organization_id' => $acme->id,
                    'email' => strtolower($inv['email']),
                ],
                [
                    'invited_by_user_id' => $inv['invited_by_user_id'],
                    'role' => $inv['role'],
                    'department_id' => $inv['department_id'],
                    'token' => Str::random(32),
                    'status' => InvitationStatus::Pending,
                    'expires_at' => now()->addDays(7),
                    'accepted_at' => null,
                ]
            );
        }

        // 7. Seed Expense Categories with Budgets & Max Amounts
        $cloudCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Software & Cloud Services'],
            [
                'description' => 'SaaS subscriptions, cloud hosting infrastructure, and developer tools',
                'icon' => 'server',
                'color' => '#10b981',
                'max_amount' => 5000.00,
                'budget_amount' => 25000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        $travelCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Travel & Lodging'],
            [
                'description' => 'Airline tickets, hotel stays, rental cars, and rideshares',
                'icon' => 'plane',
                'color' => '#3b82f6',
                'max_amount' => 1500.00,
                'budget_amount' => 15000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        $officeCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Office Supplies & Hardware'],
            [
                'description' => 'Laptops, monitors, office furniture, and stationary supplies',
                'icon' => 'laptop',
                'color' => '#8b5cf6',
                'max_amount' => 2000.00,
                'budget_amount' => 8000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        $marketingCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Marketing & Advertising'],
            [
                'description' => 'Digital ad campaigns, sponsorships, and promotional assets',
                'icon' => 'megaphone',
                'color' => '#ec4899',
                'max_amount' => 4000.00,
                'budget_amount' => 12000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
                'is_active' => true,
                'sort_order' => 4,
            ]
        );

        $mealsCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Meals & Client Entertainment'],
            [
                'description' => 'Client dinners, team lunches, and event catering',
                'icon' => 'utensils',
                'color' => '#f59e0b',
                'max_amount' => 300.00,
                'budget_amount' => 5000.00,
                'budget_currency' => 'USD',
                'budget_period' => BudgetPeriod::Monthly,
                'is_active' => true,
                'sort_order' => 5,
            ]
        );

        // 8. Seed Detailed Sample Expenses with Line Items
        $sampleExpenses = [
            [
                'merchant' => 'Amazon Web Services',
                'user' => $employee1,
                'category' => $cloudCat,
                'amount' => 1450.00,
                'tax' => 50.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Approved,
                'desc' => 'Monthly AWS infrastructure & database compute costs',
                'date' => now()->subDays(5),
                'confidence' => 99.2,
                'line_items' => [
                    ['description' => 'EC2 On-Demand Compute Instances (us-east-1)', 'quantity' => 2, 'unit_price' => 400.00, 'total_price' => 800.00],
                    ['description' => 'RDS PostgreSQL Multi-AZ Production Database', 'quantity' => 1, 'unit_price' => 450.00, 'total_price' => 450.00],
                    ['description' => 'S3 Storage & CloudFront Data Transfer', 'quantity' => 1, 'unit_price' => 150.00, 'total_price' => 150.00],
                    ['description' => 'Estimated Sales Tax', 'quantity' => 1, 'unit_price' => 50.00, 'total_price' => 50.00],
                ],
            ],
            [
                'merchant' => 'GitHub Inc.',
                'user' => $employee1,
                'category' => $cloudCat,
                'amount' => 250.00,
                'tax' => 0.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Reimbursed,
                'desc' => 'GitHub Enterprise organization license renewal',
                'date' => now()->subDays(12),
                'confidence' => 98.7,
                'line_items' => [
                    ['description' => 'GitHub Enterprise Seats', 'quantity' => 25, 'unit_price' => 10.00, 'total_price' => 250.00],
                ],
            ],
            [
                'merchant' => 'Uber Technologies',
                'user' => $employee1,
                'category' => $travelCat,
                'amount' => 68.50,
                'tax' => 0.00,
                'tip' => 10.00,
                'status' => ExpenseStatus::Submitted,
                'desc' => 'Airport transfer for tech conference presentation',
                'date' => now()->subDays(2),
                'confidence' => 94.5,
                'line_items' => [
                    ['description' => 'UberX Airport Ride', 'quantity' => 1, 'unit_price' => 58.50, 'total_price' => 58.50],
                    ['description' => 'Driver Gratuity', 'quantity' => 1, 'unit_price' => 10.00, 'total_price' => 10.00],
                ],
            ],
            [
                'merchant' => 'Hilton Hotels & Resorts',
                'user' => $employee2,
                'category' => $travelCat,
                'amount' => 620.00,
                'tax' => 70.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Submitted,
                'desc' => 'Lodging for enterprise client pitch meeting in Chicago',
                'date' => now()->subDays(3),
                'confidence' => 97.1,
                'line_items' => [
                    ['description' => 'Deluxe King Room (2 Nights)', 'quantity' => 2, 'unit_price' => 250.00, 'total_price' => 500.00],
                    ['description' => 'State & Municipal Lodging Tax', 'quantity' => 1, 'unit_price' => 70.00, 'total_price' => 70.00],
                    ['description' => 'High-Speed Business Internet & Parking', 'quantity' => 1, 'unit_price' => 50.00, 'total_price' => 50.00],
                ],
            ],
            [
                'merchant' => 'The Capital Grille',
                'user' => $employee2,
                'category' => $mealsCat,
                'amount' => 340.00,
                'tax' => 30.00,
                'tip' => 50.00,
                'status' => ExpenseStatus::Approved,
                'desc' => 'Dinner meeting with prospective Fortune 500 client stakeholders',
                'date' => now()->subDays(8),
                'confidence' => 91.2,
                'line_items' => [
                    ['description' => 'Prime Steak Entrees (3 Guests)', 'quantity' => 3, 'unit_price' => 65.00, 'total_price' => 195.00],
                    ['description' => 'Beverages & Appetizers', 'quantity' => 1, 'unit_price' => 65.00, 'total_price' => 65.00],
                    ['description' => 'Gratuity (18%)', 'quantity' => 1, 'unit_price' => 50.00, 'total_price' => 50.00],
                    ['description' => 'Sales Tax', 'quantity' => 1, 'unit_price' => 30.00, 'total_price' => 30.00],
                ],
            ],
            [
                'merchant' => 'Apple Store',
                'user' => $employee3,
                'category' => $officeCat,
                'amount' => 1299.00,
                'tax' => 99.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Reimbursed,
                'desc' => 'New workstation laptop for marketing designer onboarding',
                'date' => now()->subDays(10),
                'confidence' => 99.0,
                'line_items' => [
                    ['description' => 'MacBook Air M3 15" 16GB RAM', 'quantity' => 1, 'unit_price' => 1200.00, 'total_price' => 1200.00],
                    ['description' => 'AppleCare+ & Adapter', 'quantity' => 1, 'unit_price' => 99.00, 'total_price' => 99.00],
                ],
            ],
            [
                'merchant' => 'Google Ads',
                'user' => $employee3,
                'category' => $marketingCat,
                'amount' => 1850.00,
                'tax' => 0.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Submitted,
                'desc' => 'Search keyword advertising campaign for Q3 product release',
                'date' => now()->subDays(1),
                'confidence' => 96.8,
                'line_items' => [
                    ['description' => 'Google Search Ad Clicks (Brand Keywords)', 'quantity' => 1, 'unit_price' => 1150.00, 'total_price' => 1150.00],
                    ['description' => 'Display Network Retargeting Campaign', 'quantity' => 1, 'unit_price' => 700.00, 'total_price' => 700.00],
                ],
            ],
            [
                'merchant' => 'Starbucks Coffee',
                'user' => $employee3,
                'category' => $mealsCat,
                'amount' => 45.00,
                'tax' => 3.50,
                'tip' => 0.00,
                'status' => ExpenseStatus::Rejected,
                'desc' => 'Personal weekend coffees during remote work',
                'date' => now()->subDays(6),
                'confidence' => 95.0,
                'rejection_reason' => 'Weekend personal coffee purchases are not eligible for reimbursement under company policy.',
                'line_items' => [
                    ['description' => 'Handcrafted Coffees & Pastries', 'quantity' => 4, 'unit_price' => 11.25, 'total_price' => 45.00],
                ],
            ],
            [
                'merchant' => 'JetBlue Airways',
                'user' => $engManager,
                'category' => $travelCat,
                'amount' => 480.00,
                'tax' => 40.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Approved,
                'desc' => 'Flight to San Francisco for annual engineering leadership summit',
                'date' => now()->subDays(14),
                'confidence' => 98.4,
                'line_items' => [
                    ['description' => 'Roundtrip Flight NYC to SFO', 'quantity' => 1, 'unit_price' => 440.00, 'total_price' => 440.00],
                    ['description' => 'FAA Segment Fee & Taxes', 'quantity' => 1, 'unit_price' => 40.00, 'total_price' => 40.00],
                ],
            ],
            [
                'merchant' => 'QuickBooks Online',
                'user' => $financeUser,
                'category' => $cloudCat,
                'amount' => 180.00,
                'tax' => 0.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Reimbursed,
                'desc' => 'Monthly accounting suite subscription',
                'date' => now()->subDays(15),
                'confidence' => 99.5,
                'line_items' => [
                    ['description' => 'QuickBooks Online Advanced Tier Subscription', 'quantity' => 1, 'unit_price' => 180.00, 'total_price' => 180.00],
                ],
            ],
            [
                'merchant' => 'Best Buy Business',
                'user' => $employee1,
                'category' => $officeCat,
                'amount' => 320.00,
                'tax' => 20.00,
                'tip' => 0.00,
                'status' => ExpenseStatus::Draft,
                'desc' => 'Ergonomic dual monitor arm and wireless peripherals draft claim',
                'date' => now(),
                'confidence' => 93.0,
                'line_items' => [
                    ['description' => 'Dual Monitor Desk Mount', 'quantity' => 1, 'unit_price' => 200.00, 'total_price' => 200.00],
                    ['description' => 'Ergonomic Wireless Mouse & Keyboard Combo', 'quantity' => 1, 'unit_price' => 100.00, 'total_price' => 100.00],
                    ['description' => 'State Sales Tax', 'quantity' => 1, 'unit_price' => 20.00, 'total_price' => 20.00],
                ],
            ],
        ];

        foreach ($sampleExpenses as $data) {
            /** @var User $user */
            $user = $data['user'];
            /** @var ExpenseCategory $category */
            $category = $data['category'];

            $expense = Expense::create([
                'uuid' => (string) Str::uuid(),
                'organization_id' => $acme->id,
                'user_id' => $user->id,
                'expense_category_id' => $category->id,
                'merchant_name' => $data['merchant'],
                'amount' => $data['amount'],
                'tax_amount' => $data['tax'],
                'tip_amount' => $data['tip'],
                'currency_code' => 'USD',
                'expense_date' => $data['date']->format('Y-m-d'),
                'description' => $data['desc'],
                'payment_method' => PaymentMethod::CreditCard,
                'status' => $data['status'],
                'submitted_at' => $data['status'] === ExpenseStatus::Draft ? null : $data['date'],
                'approved_at' => in_array($data['status'], [ExpenseStatus::Approved, ExpenseStatus::Reimbursed], true) ? $data['date']->addHours(4) : null,
                'reimbursed_at' => $data['status'] === ExpenseStatus::Reimbursed ? $data['date']->addDays(2) : null,
                'rejected_at' => $data['status'] === ExpenseStatus::Rejected ? $data['date']->addHours(6) : null,
                'rejection_reason' => $data['rejection_reason'] ?? null,
                'metadata' => [
                    'ai_ocr_extracted' => true,
                    'ai_confidence_score' => $data['confidence'],
                ],
            ]);

            foreach ($data['line_items'] as $index => $itemData) {
                $expense->lineItems()->create([
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => $itemData['total_price'],
                    'sort_order' => $index + 1,
                ]);
            }
        }

        TenantContext::clear();
    }
}
