<?php

namespace Database\Seeders;

use App\Enums\ExpenseStatus;
use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
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

        // 2. Create Organization 1: Acme Corp
        $acme = Organization::updateOrCreate(
            ['slug' => 'acme-corp'],
            [
                'name' => 'Acme Corporation',
                'plan_tier' => 'pro',
            ]
        );

        // 3. Create Organization 2: Globex Financial
        $globex = Organization::updateOrCreate(
            ['slug' => 'globex-financial'],
            [
                'name' => 'Globex Financial',
                'plan_tier' => 'enterprise',
            ]
        );

        // Attach superAdmin to both orgs
        $superAdmin->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Owner->value, 'is_active' => true],
            $globex->id => ['role' => UserRole::Owner->value, 'is_active' => true],
        ]);

        // 4. Create Employee and Manager for Acme Corp
        $manager = User::updateOrCreate(
            ['email' => 'manager@acme.com'],
            [
                'name' => 'Sarah Jenkins (Manager)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $employee = User::updateOrCreate(
            ['email' => 'employee@acme.com'],
            [
                'name' => 'Alex Rivera (Employee)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $manager->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Manager->value, 'is_active' => true],
        ]);

        $employee->organizations()->syncWithoutDetaching([
            $acme->id => ['role' => UserRole::Employee->value, 'is_active' => true],
        ]);

        // 5. Seed Departments & Categories for Acme Corp
        TenantContext::set($acme->id);

        $engDept = Department::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Engineering'],
            ['description' => 'Software engineering and product development', 'budget_amount' => 50000.00]
        );
        $salesDept = Department::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Global Sales'],
            ['description' => 'Enterprise sales and business development', 'budget_amount' => 30000.00]
        );

        $travelCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Travel & Lodging'],
            ['description' => 'Flights, hotels, and transportation', 'max_amount' => 1000.00]
        );
        $mealsCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Meals & Client Entertainment'],
            ['description' => 'Client dinners and team meals', 'max_amount' => 250.00]
        );
        $cloudCat = ExpenseCategory::updateOrCreate(
            ['organization_id' => $acme->id, 'name' => 'Software & Cloud Services'],
            ['description' => 'SaaS subscriptions and cloud hosting', 'max_amount' => 5000.00]
        );

        // 6. Seed Sample Expenses for Acme Corp
        $sampleExpenses = [
            [
                'merchant' => 'Uber Technologies',
                'amount' => 42.50,
                'category_id' => $travelCat->id,
                'status' => ExpenseStatus::Submitted,
                'user_id' => $employee->id,
                'desc' => 'Airport transfer for quarterly team sync',
                'confidence' => 96.2,
            ],
            [
                'merchant' => 'Hilton Hotels & Resorts',
                'amount' => 380.00,
                'category_id' => $travelCat->id,
                'status' => ExpenseStatus::Approved,
                'user_id' => $employee->id,
                'desc' => '2-night stay for tech conference',
                'confidence' => 98.5,
            ],
            [
                'merchant' => 'Amazon Web Services',
                'amount' => 1240.80,
                'category_id' => $cloudCat->id,
                'status' => ExpenseStatus::Reimbursed,
                'user_id' => $superAdmin->id,
                'desc' => 'Production EC2 & RDS cloud hosting infrastructure',
                'confidence' => 99.1,
            ],
            [
                'merchant' => 'The Capital Grille',
                'amount' => 215.40,
                'category_id' => $mealsCat->id,
                'status' => ExpenseStatus::Submitted,
                'user_id' => $employee->id,
                'desc' => 'Dinner meeting with prospective enterprise client',
                'confidence' => 88.4,
            ],
            [
                'merchant' => 'Starbucks Coffee',
                'amount' => 14.25,
                'category_id' => $mealsCat->id,
                'status' => ExpenseStatus::Rejected,
                'user_id' => $employee->id,
                'desc' => 'Personal coffee during remote work',
                'confidence' => 95.0,
            ],
        ];

        foreach ($sampleExpenses as $data) {
            $expense = Expense::create([
                'uuid' => (string) Str::uuid(),
                'organization_id' => $acme->id,
                'user_id' => $data['user_id'],
                'expense_category_id' => $data['category_id'],
                'merchant_name' => $data['merchant'],
                'amount' => $data['amount'],
                'currency_code' => 'USD',
                'expense_date' => now()->subDays(rand(1, 14))->format('Y-m-d'),
                'description' => $data['desc'],
                'payment_method' => PaymentMethod::CreditCard,
                'status' => $data['status'],
                'submitted_at' => now()->subDays(rand(1, 5)),
                'approved_at' => $data['status'] === ExpenseStatus::Approved || $data['status'] === ExpenseStatus::Reimbursed ? now() : null,
                'reimbursed_at' => $data['status'] === ExpenseStatus::Reimbursed ? now() : null,
                'rejected_at' => $data['status'] === ExpenseStatus::Rejected ? now() : null,
                'rejection_reason' => $data['status'] === ExpenseStatus::Rejected ? 'Personal expense not eligible under company policy' : null,
                'metadata' => [
                    'ai_ocr_extracted' => true,
                    'ai_confidence_score' => $data['confidence'],
                ],
            ]);

            $expense->lineItems()->create([
                'description' => "Receipt Item for {$data['merchant']}",
                'unit_price' => $data['amount'],
                'total_price' => $data['amount'],
                'quantity' => 1,
            ]);
        }

        TenantContext::clear();
    }
}
