<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;

final class DefaultCategoriesSeeder extends Seeder
{
    public function run(?Organization $organization = null): void
    {
        $categories = [
            ['name' => 'Meals & Entertainment', 'icon' => 'utensils', 'color' => '#F59E0B'],
            ['name' => 'Travel', 'icon' => 'plane', 'color' => '#3B82F6'],
            ['name' => 'Office Supplies', 'icon' => 'briefcase', 'color' => '#10B981'],
            ['name' => 'Software & Subscriptions', 'icon' => 'code', 'color' => '#8B5CF6'],
            ['name' => 'Transportation', 'icon' => 'car', 'color' => '#EF4444'],
            ['name' => 'Lodging', 'icon' => 'hotel', 'color' => '#6366F1'],
            ['name' => 'Telecommunications', 'icon' => 'phone', 'color' => '#06B6D4'],
            ['name' => 'Professional Development', 'icon' => 'book', 'color' => '#EC4899'],
            ['name' => 'Miscellaneous', 'icon' => 'tag', 'color' => '#6B7280'],
        ];

        $orgs = $organization ? collect([$organization]) : Organization::all();

        foreach ($orgs as $org) {
            TenantContext::set($org->id);
            foreach ($categories as $index => $cat) {
                ExpenseCategory::firstOrCreate(
                    ['organization_id' => $org->id, 'name' => $cat['name']],
                    [
                        'description' => "Standard category for {$cat['name']}",
                        'icon' => $cat['icon'],
                        'color' => $cat['color'],
                        'is_active' => true,
                        'sort_order' => $index,
                    ]
                );
            }
            TenantContext::clear();
        }
    }
}
