<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Http\Controllers\AccountantPortalController;
use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\AdminDepartmentController;
use App\Http\Controllers\AdminInvitationController;
use App\Http\Controllers\AdminMemberController;
use App\Http\Controllers\AdminPortalController;
use App\Http\Controllers\AdminSettingsController;
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
        if ($activeOrg) {
            $role = $user->roleIn($activeOrg);
            if ($role === UserRole::Admin || $role === UserRole::Owner) {
                return redirect()->route('admin.dashboard');
            }
            if ($role === UserRole::Accountant) {
                return redirect()->route('accountant.dashboard');
            }
            if ($role === UserRole::Manager || $user->isManagerOf($activeOrg)) {
                return redirect()->route('portal.manager.expenses');
            }
        }

        return redirect()->route('portal.expenses');
    })->name('dashboard');

    // Admin Console — organization-wide administration
    Route::prefix('admin')->name('admin.')->group(function (): void {
        Route::get('/dashboard', [AdminPortalController::class, 'dashboard'])->name('dashboard');
        Route::get('/approvals', [AdminPortalController::class, 'approvals'])->name('approvals');
        Route::post('/switch-organization', [AdminPortalController::class, 'switchOrganization'])->name('switch-organization');

        Route::get('/members', [AdminMemberController::class, 'index'])->name('members');
        Route::put('/members/{member}', [AdminMemberController::class, 'update'])->name('members.update');
        Route::delete('/members/{member}', [AdminMemberController::class, 'destroy'])->name('members.destroy');

        Route::get('/invitations', [AdminInvitationController::class, 'index'])->name('invitations');
        Route::post('/invitations', [AdminInvitationController::class, 'store'])->name('invitations.store');
        Route::post('/invitations/{invitation}/resend', [AdminInvitationController::class, 'resend'])->name('invitations.resend');
        Route::delete('/invitations/{invitation}', [AdminInvitationController::class, 'destroy'])->name('invitations.destroy');

        Route::get('/departments', [AdminDepartmentController::class, 'index'])->name('departments');
        Route::post('/departments', [AdminDepartmentController::class, 'store'])->name('departments.store');
        Route::put('/departments/{department}', [AdminDepartmentController::class, 'update'])->name('departments.update');
        Route::delete('/departments/{department}', [AdminDepartmentController::class, 'destroy'])->name('departments.destroy');

        Route::get('/categories', [AdminCategoryController::class, 'index'])->name('categories');
        Route::post('/categories', [AdminCategoryController::class, 'store'])->name('categories.store');
        Route::put('/categories/{category}', [AdminCategoryController::class, 'update'])->name('categories.update');
        Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy'])->name('categories.destroy');

        Route::get('/settings', [AdminSettingsController::class, 'edit'])->name('settings');
        Route::put('/settings', [AdminSettingsController::class, 'update'])->name('settings.update');
        Route::delete('/settings/organization', [AdminSettingsController::class, 'destroy'])->name('settings.destroy');
    });

    // Accountant Portal Dedicated Pages & Downloads
    Route::prefix('accountant')->name('accountant.')->group(function (): void {
        Route::get('/dashboard', [AccountantPortalController::class, 'dashboard'])->name('dashboard');
        Route::get('/reimbursements', [AccountantPortalController::class, 'reimbursements'])->name('reimbursements');
        Route::get('/approved-expenses', [AccountantPortalController::class, 'approvedExpenses'])->name('approved-expenses');
        Route::get('/gl-categories', [AccountantPortalController::class, 'glCategories'])->name('gl-categories');
        Route::put('/gl-categories/{category}', [AccountantPortalController::class, 'updateGlCategory'])->name('gl-categories.update');
        Route::get('/analytics', [AccountantPortalController::class, 'analytics'])->name('analytics');
        Route::get('/audit-logs', [AccountantPortalController::class, 'auditLogs'])->name('audit-logs');
        Route::get('/expenses', [AccountantPortalController::class, 'expensesLookup'])->name('expenses');

        // Web Session Download & Export Routes (Session authenticated)
        Route::get('/export-erp', [AccountantPortalController::class, 'exportErp'])->name('export-erp');
        Route::get('/download-compliance-package', [AccountantPortalController::class, 'downloadCompliancePackage'])->name('download-compliance-package');
        Route::get('/reimbursement-batches/{batch}/bank-file', [AccountantPortalController::class, 'downloadBankFile'])->name('download-bank-file');
        Route::get('/aggregates-summary', [AccountantPortalController::class, 'downloadAggregatesSummary'])->name('download-aggregates-summary');
    });

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
