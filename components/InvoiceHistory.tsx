"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { AlertCircle, FileText, Download, ExternalLink } from 'lucide-react';

type Invoice = {
  id: string;
  number: string;
  created: number;
  amount_paid: number;
  status: string;
  hosted_invoice_url: string;
  invoice_pdf: string;
  currency: string;
  description: string | null;
};

export const InvoiceHistory = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!isLoaded || !isSignedIn) return;

      try {
        setLoading(true);
        const response = await fetch('/api/invoices');

        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }

        const data = await response.json();
        
        // Debug log to check data received from API
        console.log('Invoices data received:', data);
        
        // Check that invoices data is an array
        if (data.invoices && Array.isArray(data.invoices)) {
          console.log(`Found ${data.invoices.length} invoices`);
          setInvoices(data.invoices);
        } else {
          console.error('Invalid invoices data format:', data);
          // Handle case where invoices might not be an array
          setInvoices(data.invoices && !Array.isArray(data.invoices) 
            ? [data.invoices] // Convert single object to array
            : []);
        }
      } catch (err) {
        setError('Unable to load invoice history');
        console.error('Error fetching invoices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [isLoaded, isSignedIn]);

  // Format date from Unix timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatAmount = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    
    return formatter.format(amount / 100); // Stripe amounts are in cents
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-700">
        <p>You need to sign in to view your invoice history.</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="p-6 bg-white border-zinc-200 text-center">
        <FileText className="mx-auto h-12 w-12 text-zinc-300 mb-3" />
        <h3 className="text-lg font-medium text-zinc-900">No invoices yet</h3>
        <p className="text-zinc-500 mt-1">Your purchase history will appear here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Invoice History</h2>
        <p className="text-sm text-zinc-500">View and download your past purchases</p>
      </div>

      <div className="overflow-hidden border border-zinc-200 rounded-lg">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Invoice #
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {invoices && invoices.length > 0 ? (
              invoices.map((invoice, index) => (
                <tr key={invoice.id || `invoice-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                    {invoice.created ? formatDate(invoice.created) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                    {invoice.number || `INV-${index}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                    {typeof invoice.amount_paid === 'number' 
                      ? formatAmount(invoice.amount_paid, invoice.currency || 'usd') 
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-zinc-100 text-zinc-800'}`}>
                      {invoice.status 
                        ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) 
                        : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      {invoice.hosted_invoice_url && (
                        <a 
                          href={invoice.hosted_invoice_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      )}
                      {invoice.invoice_pdf && (
                        <a 
                          href={invoice.invoice_pdf} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">
                  No invoice records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 