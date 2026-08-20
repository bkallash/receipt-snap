<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ExportFormat;
use App\Models\Expense;
use App\Models\ReimbursementBatch;
use Illuminate\Support\Collection;

final class AccountingExportService
{
    /**
     * Generate banking payout file for a batch based on requested format.
     */
    public function generateBankFile(ReimbursementBatch $batch, ExportFormat $format): string
    {
        $batch->load(['expenses.user', 'expenses.category']);
        /** @var \Illuminate\Database\Eloquent\Collection<int, Expense> $expenses */
        $expenses = $batch->expenses;

        return match ($format) {
            ExportFormat::Nacha => $this->generateNachaFile($batch, $expenses),
            ExportFormat::SepaXml => $this->generateSepaXmlFile($batch, $expenses),
            default => $this->generateStandardCsv($expenses),
        };
    }

    /**
     * Export expenses tailored for QuickBooks Online or Desktop (CSV / IIF).
     *
     * @param  Collection<int, Expense>  $expenses
     */
    public function exportQuickBooks(Collection $expenses, string $variant = 'csv'): string
    {
        if (strtolower($variant) === 'iif') {
            return $this->generateQuickBooksIif($expenses);
        }

        $output = [];
        $output[] = ['Transaction Date', 'Ref No', 'Payee', 'Account', 'Amount', 'Tax Amount', 'Memo', 'GL Code'];

        foreach ($expenses as $expense) {
            $user = $expense->user;
            $cat = $expense->category;

            $output[] = [
                $expense->expense_date ? $expense->expense_date->format('m/d/Y') : '',
                $expense->uuid,
                $user instanceof \App\Models\User ? $user->name : 'Employee',
                $cat instanceof \App\Models\ExpenseCategory ? $cat->name : 'Uncategorized',
                number_format((float) $expense->amount, 2, '.', ''),
                number_format((float) ($expense->tax_amount ?? 0), 2, '.', ''),
                $expense->merchant_name ?? $expense->description ?? 'Expense Claim',
                $cat instanceof \App\Models\ExpenseCategory && $cat->gl_code ? $cat->gl_code : 'GL-6000',
            ];
        }

        return $this->toCsvString($output);
    }

    /**
     * Export expenses tailored for Xero (Payables Bill Import CSV).
     *
     * @param  Collection<int, Expense>  $expenses
     */
    public function exportXero(Collection $expenses): string
    {
        $output = [];
        $output[] = ['ContactName', 'EmailAddress', 'InvoiceNumber', 'InvoiceDate', 'DueDate', 'Total', 'InventoryItemCode', 'Description', 'AccountCode', 'TaxType', 'TaxAmount'];

        foreach ($expenses as $expense) {
            $user = $expense->user;
            $cat = $expense->category;

            $output[] = [
                $user instanceof \App\Models\User ? $user->name : 'Employee Reimbursement',
                $user instanceof \App\Models\User ? $user->email : '',
                'EXP-'.$expense->id,
                $expense->expense_date ? $expense->expense_date->format('Y-m-d') : '',
                now()->addDays(7)->format('Y-m-d'),
                number_format((float) $expense->amount, 2, '.', ''),
                '',
                $expense->merchant_name ?? $expense->description ?? 'Expense',
                $cat instanceof \App\Models\ExpenseCategory && $cat->gl_code ? $cat->gl_code : '600',
                ($expense->tax_amount ?? 0) > 0 ? 'OUTPUT' : 'EXEMPT',
                number_format((float) ($expense->tax_amount ?? 0), 2, '.', ''),
            ];
        }

        return $this->toCsvString($output);
    }

    /**
     * Export expenses for NetSuite / SAP Journal Entry CSV.
     *
     * @param  Collection<int, Expense>  $expenses
     */
    public function exportNetSuiteSap(Collection $expenses, string $system = 'netsuite'): string
    {
        $output = [];
        $output[] = ['External ID', 'Date', 'Entity Name', 'Account GL Code', 'Debit Amount', 'Credit Amount', 'Tax Code', 'Memo', 'Department'];

        foreach ($expenses as $expense) {
            $user = $expense->user;
            $cat = $expense->category;

            $output[] = [
                $expense->uuid,
                $expense->expense_date ? $expense->expense_date->format('Y-m-d') : '',
                $user instanceof \App\Models\User ? $user->name : 'Employee',
                $cat instanceof \App\Models\ExpenseCategory && $cat->gl_code ? $cat->gl_code : 'GL-6000',
                number_format((float) $expense->amount, 2, '.', ''),
                '0.00',
                ($expense->tax_amount ?? 0) > 0 ? 'VAT_20' : 'TAX_FREE',
                $expense->merchant_name ?? 'Expense',
                'General',
            ];
        }

        return $this->toCsvString($output);
    }

    /**
     * Generate Tax Ledger CSV report.
     *
     * @param  Collection<int, Expense>  $expenses
     */
    public function exportTaxLedger(Collection $expenses): string
    {
        $output = [];
        $output[] = ['Expense UUID', 'Date', 'Employee', 'Merchant', 'Merchant Tax/VAT ID', 'Subtotal', 'Tax/VAT Amount', 'Total Amount', 'GL Code', 'Tax Verified'];

        foreach ($expenses as $expense) {
            $user = $expense->user;
            $cat = $expense->category;
            $subtotal = (float) $expense->amount - (float) ($expense->tax_amount ?? 0);

            $output[] = [
                $expense->uuid,
                $expense->expense_date ? $expense->expense_date->format('Y-m-d') : '',
                $user instanceof \App\Models\User ? $user->name : 'N/A',
                $expense->merchant_name ?? 'N/A',
                $expense->merchant_vat_id ?? 'N/A',
                number_format($subtotal, 2, '.', ''),
                number_format((float) ($expense->tax_amount ?? 0), 2, '.', ''),
                number_format((float) $expense->amount, 2, '.', ''),
                $cat instanceof \App\Models\ExpenseCategory && $cat->gl_code ? $cat->gl_code : 'UNMAPPED',
                $expense->tax_verified ? 'YES' : 'NO',
            ];
        }

        return $this->toCsvString($output);
    }

    /**
     * Generate Standard Banking CSV.
     *
     * @param  Collection<int, Expense>  $expenses
     */
    public function generateStandardCsv(Collection $expenses): string
    {
        $output = [];
        $output[] = ['Claim ID', 'Approval Date', 'Employee Name', 'Employee Email', 'Amount', 'Currency', 'Category', 'GL Code', 'Payment Reference'];

        foreach ($expenses as $expense) {
            $user = $expense->user;
            $cat = $expense->category;

            $output[] = [
                $expense->uuid,
                $expense->approved_at ? $expense->approved_at->format('Y-m-d') : $expense->updated_at->format('Y-m-d'),
                $user instanceof \App\Models\User ? $user->name : 'Employee',
                $user instanceof \App\Models\User ? $user->email : '',
                number_format((float) $expense->amount, 2, '.', ''),
                $expense->currency_code,
                $cat instanceof \App\Models\ExpenseCategory ? $cat->name : 'General',
                $cat instanceof \App\Models\ExpenseCategory && $cat->gl_code ? $cat->gl_code : 'GL-6000',
                $expense->payment_reference ?? 'UNPAID',
            ];
        }

        return $this->toCsvString($output);
    }

    private function generateNachaFile(ReimbursementBatch $batch, Collection $expenses): string
    {
        $lines = [];
        // Header record
        $lines[] = '101 011000015 '.str_pad($batch->organization_id.'', 10, '0', STR_PAD_LEFT).' '.now()->format('ymdHi').' A094101 BankOfAmerica        ReceiptSnap          ';
        // Batch Header
        $lines[] = '5220ReceiptSnap Payout          '.str_pad($batch->batch_number, 10, ' ').'CCDEXPENSE  '.now()->format('ymd').'   1011000010000001';

        foreach ($expenses as $idx => $expense) {
            $seq = str_pad((string) ($idx + 1), 7, '0', STR_PAD_LEFT);
            $amountCents = str_pad((string) (int) ($expense->amount * 100), 10, '0', STR_PAD_LEFT);
            $userName = $expense->user instanceof \App\Models\User ? $expense->user->name : 'Employee';
            $name = str_pad(substr($userName, 0, 22), 22, ' ');
            $lines[] = "622123456780123456789{$amountCents}EMP-{$expense->user_id}         {$name}S 001100001{$seq}";
        }

        // Batch Control & File Control
        $totalCents = str_pad((string) (int) ($batch->total_amount * 100), 12, '0', STR_PAD_LEFT);
        $lines[] = '8220'.str_pad((string) $expenses->count(), 6, '0', STR_PAD_LEFT).'000000000000'.$totalCents.'                    011000010000001';
        $lines[] = '9000001000001'.str_pad((string) $expenses->count(), 6, '0', STR_PAD_LEFT).'000000000000'.$totalCents;

        return implode("\r\n", $lines);
    }

    private function generateSepaXmlFile(ReimbursementBatch $batch, Collection $expenses): string
    {
        $xml = new \SimpleXMLElement('<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"/>');
        $cstmrCdtTrfInitn = $xml->addChild('CstmrCdtTrfInitn');

        $grpHdr = $cstmrCdtTrfInitn->addChild('GrpHdr');
        $grpHdr->addChild('MsgId', $batch->batch_number);
        $grpHdr->addChild('CreDtTm', now()->toIso8601String());
        $grpHdr->addChild('NbOfTxs', (string) $expenses->count());
        $grpHdr->addChild('CtrlSum', number_format((float) $batch->total_amount, 2, '.', ''));

        $pmtInf = $cstmrCdtTrfInitn->addChild('PmtInf');
        $pmtInf->addChild('PmtInfId', 'PMT-'.$batch->batch_number);
        $pmtInf->addChild('PmtMtd', 'TRF');

        foreach ($expenses as $expense) {
            $cdtTrfTxInf = $pmtInf->addChild('CdtTrfTxInf');
            $pmtId = $cdtTrfTxInf->addChild('PmtId');
            $pmtId->addChild('EndToEndId', $expense->uuid);

            $amt = $cdtTrfTxInf->addChild('Amt');
            $instdAmt = $amt->addChild('InstdAmt', number_format((float) $expense->amount, 2, '.', ''));
            $instdAmt->addAttribute('Ccy', $expense->currency_code);

            $cdtr = $cdtTrfTxInf->addChild('Cdtr');
            $userName = $expense->user instanceof \App\Models\User ? $expense->user->name : 'Employee';
            $cdtr->addChild('Nm', htmlspecialchars($userName));
        }

        return $xml->asXML() ?: '';
    }

    private function generateQuickBooksIif(Collection $expenses): string
    {
        $lines = [];
        $lines[] = "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO";
        $lines[] = "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO";
        $lines[] = '!ENDTRNS';

        foreach ($expenses as $expense) {
            $lines[] = "TRNS\t{$expense->id}\tCHECK\t{$expense->expense_date->format('m/d/Y')}\t1000 Checking Account\t{$expense->user?->name}\t-{$expense->amount}\t{$expense->merchant_name}";
            $lines[] = "SPL\t{$expense->id}\tCHECK\t{$expense->expense_date->format('m/d/Y')}\t{$expense->category?->gl_code}\t{$expense->user?->name}\t{$expense->amount}\t{$expense->merchant_name}";
            $lines[] = 'ENDTRNS';
        }

        return implode("\r\n", $lines);
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    private function toCsvString(array $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        if (! $handle) {
            return '';
        }

        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);

        return $contents ?: '';
    }
}
