<?php

declare(strict_types=1);

namespace App\Enums;

enum AggregateType: string
{
    case Organization = 'organization';
    case Department = 'department';
    case Category = 'category';
}
