<?php

declare(strict_types=1);

namespace App\Enums;

enum ExpenseStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Processing = 'processing';
    case Reimbursed = 'reimbursed';
    case PendingScan = 'pending_scan';
}
