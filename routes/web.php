<?php

use App\Http\Controllers\EmployeePortalController;
use App\Http\Controllers\OrganizationInvitationPortalController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Landing');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route('portal.expenses');
    })->name('dashboard');

    Route::get('/portal/expenses', [EmployeePortalController::class, 'index'])->name('portal.expenses');
    Route::get('/portal/receipt-images/{receiptImage}/file', [EmployeePortalController::class, 'showReceiptImage'])->name('portal.receipt-image');

    Route::get('/portal/invitations', [OrganizationInvitationPortalController::class, 'index'])->name('portal.invitations');
    Route::post('/portal/invitations/{invitation}/accept', [OrganizationInvitationPortalController::class, 'accept'])->name('portal.invitations.accept');
    Route::post('/portal/invitations/{invitation}/reject', [OrganizationInvitationPortalController::class, 'reject'])->name('portal.invitations.reject');
});

require __DIR__.'/settings.php';
