import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackgroundJob {
  id: string;
  type: 'transaction_import' | 'transaction_categorization';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: any;
  progress: number;
  result?: any;
  error_message?: string;
  user_id: string;
}

interface ImportJobPayload {
  transactions: any[];
  selectedBank: string;
  selectedCreditCardId?: string;
  layoutType: 'bank' | 'credit_card';
  importMode: 'new-only' | 'update-existing' | 'import-all';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    console.log('🔄 [BACKGROUND-PROCESSOR] Starting job processing:', jobId);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    console.log('📋 [BACKGROUND-PROCESSOR] Processing job type:', job.type);

    // Update job status to processing
    await updateJobProgress(supabase, jobId, 'processing', 5, 'Iniciando processamento...');

    // Process based on job type
    let result;
    if (job.type === 'transaction_import') {
      result = await processImportJob(supabase, job);
    } else {
      throw new Error(`Unsupported job type: ${job.type}`);
    }

    // Mark job as completed
    await updateJobProgress(supabase, jobId, 'completed', 100, 'Processamento concluído', result);

    console.log('✅ [BACKGROUND-PROCESSOR] Job completed successfully:', jobId);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [BACKGROUND-PROCESSOR] Error processing job:', error);
    
    // Try to update job status to failed
    if (req.json && (await req.json()).jobId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await updateJobProgress(
        supabase, 
        (await req.json()).jobId, 
        'failed', 
        0, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function updateJobProgress(
  supabase: any, 
  jobId: string, 
  status: string, 
  progress: number, 
  message?: string,
  result?: any
) {
  const updates: any = {
    status,
    progress,
    updated_at: new Date().toISOString()
  };

  if (message) {
    if (status === 'failed') {
      updates.error_message = message;
    }
  }

  if (result) {
    updates.result = result;
  }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('background_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error('❌ [BACKGROUND-PROCESSOR] Error updating job progress:', error);
  }
}

async function processImportJob(supabase: any, job: BackgroundJob) {
  const payload = job.payload as ImportJobPayload;
  console.log('💾 [BACKGROUND-PROCESSOR] Processing import with', payload.transactions.length, 'transactions');

  await updateJobProgress(supabase, job.id, 'processing', 10, 'Verificando duplicados...');

  // Step 1: Apply existing mappings (10-30%)
  console.log('🔍 [BACKGROUND-PROCESSOR] Applying existing mappings...');
  await updateJobProgress(supabase, job.id, 'processing', 20, 'Aplicando mapeamentos existentes...');

  // Here you would implement the mapping logic similar to your current code
  // For now, we'll simulate the process

  // Step 2: Categorize with AI (30-70%)
  console.log('🤖 [BACKGROUND-PROCESSOR] Categorizing with AI...');
  await updateJobProgress(supabase, job.id, 'processing', 40, 'Categorizando com IA...');

  // Call Gemini AI for categorization (simulate)
  // const { data: aiResults } = await supabase.functions.invoke('gemini-categorize-transactions', {
  //   body: { transactions: unmappedTransactions }
  // });

  // Step 3: Save to database (70-90%)
  console.log('💾 [BACKGROUND-PROCESSOR] Saving to database...');
  await updateJobProgress(supabase, job.id, 'processing', 70, 'Salvando no banco de dados...');

  // Implement database save logic based on layoutType
  let imported = 0;
  const errors: string[] = [];

  if (payload.layoutType === 'credit_card') {
    // Process credit card transactions
    for (const transaction of payload.transactions) {
      try {
        const { error } = await supabase
          .from('transaction_credit')
          .upsert({
            date: transaction.date,
            amount: transaction.amount,
            description: transaction.editedDescription || transaction.description,
            original_description: transaction.originalDescription,
            external_id: transaction.id,
            credit_card_id: payload.selectedCreditCardId,
            type: transaction.type,
            category_id: transaction.categoryId,
            subcategory_id: transaction.subcategoryId,
            bank_id: payload.selectedBank,
            user_id: job.user_id
          }, { onConflict: 'external_id' });

        if (error) {
          console.error('❌ [BACKGROUND-PROCESSOR] Error saving credit transaction:', error);
          errors.push(`Error saving transaction ${transaction.id}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (error) {
        console.error('❌ [BACKGROUND-PROCESSOR] Exception saving credit transaction:', error);
        errors.push(`Exception saving transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } else {
    // Process bank transactions
    for (const transaction of payload.transactions) {
      try {
        const { error } = await supabase
          .from('transactions')
          .upsert({
            external_id: transaction.id,
            date: transaction.date + 'T12:00:00',
            amount: transaction.amount,
            description: transaction.editedDescription || transaction.description,
            original_description: transaction.originalDescription,
            type: transaction.type,
            category_id: transaction.categoryId,
            subcategory_id: transaction.subcategoryId,
            bank_id: payload.selectedBank,
            user_id: job.user_id
          }, { onConflict: 'external_id' });

        if (error) {
          console.error('❌ [BACKGROUND-PROCESSOR] Error saving bank transaction:', error);
          errors.push(`Error saving transaction ${transaction.id}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (error) {
        console.error('❌ [BACKGROUND-PROCESSOR] Exception saving bank transaction:', error);
        errors.push(`Exception saving transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Step 4: Update mappings (90-100%)
  console.log('🔄 [BACKGROUND-PROCESSOR] Updating mappings...');
  await updateJobProgress(supabase, job.id, 'processing', 90, 'Atualizando mapeamentos...');

  // Here you would update transaction mappings for future use
  // Similar to your current mapping update logic

  const result = {
    imported,
    skipped: payload.transactions.length - imported,
    errors,
    total: payload.transactions.length
  };

  console.log('✅ [BACKGROUND-PROCESSOR] Import job completed:', result);
  return result;
}
