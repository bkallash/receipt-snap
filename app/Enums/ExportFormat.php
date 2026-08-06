<?php

declare(strict_types=1);

namespace App\Enums;

enum ExportFormat: string
{
    case Nacha = 'nacha';
    case SepaXml = 'sepa_xml';
    case StandardCsv = 'standard_csv';
    case QuickBooksCsv = 'quickbooks_csv';
    case QuickBooksIif = 'quickbooks_iif';
    case XeroCsv = 'xero_csv';
    case NetSuiteCsv = 'netsuite_csv';
    case SapCsv = 'sap_csv';
    case TaxLedgerCsv = 'tax_ledger_csv';
}
