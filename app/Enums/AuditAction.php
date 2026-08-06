<?php

declare(strict_types=1);

namespace App\Enums;

enum AuditAction: string
{
    case ExpenseCreated = 'expense.created';
    case ExpenseUpdated = 'expense.updated';
    case ExpenseSubmitted = 'expense.submitted';
    case ExpenseApproved = 'expense.approved';
    case ExpenseRejected = 'expense.rejected';
    case ExpenseReimbursed = 'expense.reimbursed';
    case ReimbursementBatchCreated = 'reimbursement_batch.created';
    case ReimbursementExecuted = 'reimbursement_batch.executed';
    case ExpenseDeleted = 'expense.deleted';
    case ExpenseAdminCorrected = 'expense.admin_corrected';
    case PolicyFlagAdded = 'policy.flag_added';
    case PolicyConfigUpdated = 'policy.config_updated';
    case BudgetUpdated = 'budget.updated';
    case DepartmentCreated = 'department.created';
    case DepartmentUpdated = 'department.updated';
    case CategoryCreated = 'category.created';
    case CategoryUpdated = 'category.updated';
    case MemberInvited = 'member.invited';
    case MemberRoleChanged = 'member.role_changed';
    case MemberRemoved = 'member.removed';
    case ReceiptScanned = 'receipt.scanned';
    case ReceiptScanFailed = 'receipt.scan_failed';
}
