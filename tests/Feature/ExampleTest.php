<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_redirects_to_login_for_guests(): void
    {
        $response = $this->get(route('home'));

        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_access_portal(): void
    {
        $organization = Organization::factory()->create();
        $user = User::factory()->create();
        $organization->users()->attach($user->id, ['role' => UserRole::Employee->value]);

        $response = $this->actingAs($user)->get(route('portal.expenses'));

        $response->assertOk();
    }
}
