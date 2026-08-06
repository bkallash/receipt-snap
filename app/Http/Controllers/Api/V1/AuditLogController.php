<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AuditLogResource;
use App\Models\AuditLog;
use App\Models\Organization;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $role = $user->roleIn($organization);
        if (! in_array($role, [UserRole::Owner, UserRole::Admin, UserRole::Manager, UserRole::Accountant], true)) {
            abort(403, 'Access restricted to Organization administrators, managers, and accountants.');
        }

        $query = AuditLog::with(['actor']);

        if ($action = $request->query('action')) {
            $query->byAction($action);
        }

        if ($type = $request->query('auditable_type')) {
            $fullType = str_contains($type, '\\') ? $type : "App\\Models\\{$type}";
            $query->where('auditable_type', $fullType);
        }

        if ($id = $request->query('auditable_id')) {
            $query->where('auditable_id', $id);
        }

        if ($actorId = $request->query('actor_id')) {
            $query->byActor((int) $actorId);
        }

        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', $to);
        }

        $logs = $query->latest('created_at')->latest('id')->paginate(25);

        return AuditLogResource::collection($logs);
    }

    public function show(Request $request, AuditLog $auditLog): AuditLogResource
    {
        $user = $request->user();
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $role = $user->roleIn($organization);
        if (! in_array($role, [UserRole::Owner, UserRole::Admin, UserRole::Manager, UserRole::Accountant], true)) {
            abort(403, 'Access restricted to Organization administrators, managers, and accountants.');
        }

        if ($auditLog->organization_id !== (int) $orgId) {
            abort(404);
        }

        return new AuditLogResource($auditLog->load('actor'));
    }
}
