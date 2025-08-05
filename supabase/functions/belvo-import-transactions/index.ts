import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { linkId, progressCallback } = await req.json();
    
    console.log('🏦 [BELVO-IMPORT] Starting Belvo transaction import for link:', linkId);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Belvo credentials from environment
    const belvoSecretId = Deno.env.get('BELVO_SECRET_ID');
    const belvoSecretPassword = Deno.env.get('BELVO_SECRET_PASSWORD');

    if (!belvoSecretId || !belvoSecretPassword) {
      throw new Error('Missing Belvo credentials');
    }

    // Create base64 encoded credentials for Basic Auth
    const credentials = btoa(`${belvoSecretId}:${belvoSecretPassword}`);
    const belvoApiUrl = 'https://sandbox.belvo.com/api';

    // Step 1: Get accounts from Belvo (10% progress)
    console.log('📊 [BELVO-IMPORT] Step 1: Fetching accounts...');
    const accountsResponse = await fetch(`${belvoApiUrl}/accounts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link: linkId
      })
    });

    if (!accountsResponse.ok) {
      throw new Error(`Failed to fetch accounts: ${accountsResponse.statusText}`);
    }

    const accounts = await accountsResponse.json();
    console.log('✅ [BELVO-IMPORT] Fetched', accounts.results?.length || 0, 'accounts');

    // Step 2: Get transactions for each account (20-80% progress)
    console.log('💳 [BELVO-IMPORT] Step 2: Fetching transactions...');
    let allTransactions: any[] = [];
    const accountCount = accounts.results?.length || 0;
    
    for (let i = 0; i < accountCount; i++) {
      const account = accounts.results[i];
      const progressPercent = 20 + (i / accountCount) * 60; // 20% to 80%
      
      console.log(`💳 [BELVO-IMPORT] Processing account ${i + 1}/${accountCount}: ${account.name}`);
      
      try {
        const transactionsResponse = await fetch(`${belvoApiUrl}/transactions/`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            link: linkId,
            account: account.id,
            date_from: '2024-01-01', // Last 3 months
            date_to: new Date().toISOString().split('T')[0]
          })
        });

        if (transactionsResponse.ok) {
          const transactions = await transactionsResponse.json();
          allTransactions = allTransactions.concat(transactions.results || []);
          console.log(`✅ [BELVO-IMPORT] Account ${account.name}: ${transactions.results?.length || 0} transactions`);
        } else {
          console.warn(`⚠️ [BELVO-IMPORT] Failed to fetch transactions for account ${account.name}`);
        }
      } catch (error) {
        console.error(`❌ [BELVO-IMPORT] Error fetching transactions for account ${account.name}:`, error);
      }
    }

    // Step 3: Process and categorize transactions (80-90% progress)
    console.log('🤖 [BELVO-IMPORT] Step 3: Processing transactions...');
    const processedTransactions = allTransactions.map(transaction => ({
      external_id: transaction.id,
      date: transaction.value_date,
      amount: parseFloat(transaction.amount),
      description: transaction.description || transaction.reference || 'Transação bancária',
      original_description: transaction.description || transaction.reference,
      type: parseFloat(transaction.amount) >= 0 ? 'income' : 'expense',
      account_id: transaction.account.id,
      bank_transaction_id: transaction.id,
      balance: parseFloat(transaction.balance),
      currency: transaction.currency,
      category: transaction.category || 'uncategorized',
      subcategory: transaction.subcategory || 'general'
    }));

    console.log('✅ [BELVO-IMPORT] Processed', processedTransactions.length, 'transactions');

    // Step 4: Save to database (90-100% progress)
    console.log('💾 [BELVO-IMPORT] Step 4: Saving to database...');
    
    if (processedTransactions.length > 0) {
      // Insert transactions in batches to avoid timeout
      const batchSize = 100;
      let savedCount = 0;
      
      for (let i = 0; i < processedTransactions.length; i += batchSize) {
        const batch = processedTransactions.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('belvo_transactions')
            .insert(batch)
            .select();

          if (error) {
            console.error('❌ [BELVO-IMPORT] Error inserting batch:', error);
          } else {
            savedCount += data?.length || 0;
          }
        } catch (error) {
          console.error('❌ [BELVO-IMPORT] Exception inserting batch:', error);
        }
        
        // Update progress
        const progressPercent = 90 + ((i + batchSize) / processedTransactions.length) * 10;
        console.log(`💾 [BELVO-IMPORT] Saved ${savedCount}/${processedTransactions.length} transactions (${Math.round(progressPercent)}%)`);
      }
    }

    console.log('🎉 [BELVO-IMPORT] Import completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Belvo import completed successfully',
        summary: {
          accounts: accountCount,
          transactions: processedTransactions.length,
          imported: processedTransactions.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 [BELVO-IMPORT] Critical error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
