<?php

declare(strict_types=1);

use App\Http\Controllers\EmployeePortalController;
use App\Http\Controllers\ManagerPortalController;
use App\Http\Controllers\OrganizationInvitationPortalController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Landing');
})->name('home');

/*
|--------------------------------------------------------------------------
| Authenticated Web Portal Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    // Smart Dashboard Redirector based on Organization Role
    Route::get('/dashboard', function () {
        $user = auth()->user();
        if ($user->organizations()->wherePivot('is_active', true)->doesntExist()) {
            return redirect()->route('portal.invitations');
        }

        $activeOrg = $user->currentOrganization();
        if ($activeOrg && $user->isManagerOf($activeOrg)) {
            return redirect()->route('portal.manager.expenses');
        }

        return redirect()->route('portal.expenses');
    })->name('dashboard');

    // Web Portal Group
    Route::prefix('portal')->name('portal.')->group(function () {
        // Employee Portal
        Route::get('/expenses', [EmployeePortalController::class, 'index'])->name('expenses');
        Route::get('/receipt-images/{receiptImage}/file', [EmployeePortalController::class, 'showReceiptImage'])->name('receipt-image');

        // Manager Portal
        Route::get('/manager/expenses', [ManagerPortalController::class, 'index'])->name('manager.expenses');

        // Organization Invitations
        Route::get('/invitations', [OrganizationInvitationPortalController::class, 'index'])->name('invitations');
        Route::post('/invitations/{invitation}/accept', [OrganizationInvitationPortalController::class, 'accept'])->name('invitations.accept');
        Route::post('/invitations/{invitation}/reject', [OrganizationInvitationPortalController::class, 'reject'])->name('invitations.reject');
    });
});

require __DIR__.'/settings.php';
