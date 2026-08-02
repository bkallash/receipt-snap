<?php

namespace Tests\Feature;

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
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('portal.expenses'));

        $response->assertOk();
    }
}
