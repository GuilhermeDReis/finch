import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Simulação do logger para ambiente Deno
const getLogger = (namespace: string) => {
  return {
    debug: (message: string, context?: Record<string, any>) => {
      console.log(`[DEBUG] [${namespace}] ${message}`, context || '');
    },
    info: (message: string, context?: Record<string, any>) => {
      console.log(`[INFO] [${namespace}] ${message}`, context || '');
    },
    warn: (message: string, context?: Record<string, any>) => {
      console.warn(`[WARN] [${namespace}] ${message}`, context || '');
    },
    error: (message: string, context?: Record<string, any>) => {
      console.error(`[ERROR] [${namespace}] ${message}`, context || '');
    }
  };
};

const logger = getLogger('process-import-job');

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
    logger.debug('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    logger.info('Starting job processing', { jobId });
    
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
      logger.error('Job not found', { jobId, error: jobError });
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    logger.info('Processing job', { jobId, jobType: job.type });

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
    
    // Ensure notification is created - backup mechanism in case trigger fails
    await ensureCompletionNotification(supabase, job, result);

    logger.info('Job completed successfully', { jobId, result });

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error processing job', { error: error instanceof Error ? error.message : 'Unknown error' });
    
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

  logger.debug('Updating job', { jobId, updates });
  
  const { error } = await supabase
    .from('background_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    logger.error('Error updating job progress', { jobId, error });
  } else {
    logger.info('Job updated successfully', { jobId, status });
  }
}

async function processImportJob(supabase: any, job: BackgroundJob) {
  const payload = job.payload as ImportJobPayload;
  logger.info('Processing import job', { jobId: job.id, transactionCount: payload.transactions.length });

  await updateJobProgress(supabase, job.id, 'processing', 10, 'Verificando duplicados...');

  // Step 1: Apply existing mappings (10-30%)
  logger.info('Applying existing mappings', { jobId: job.id });
  await updateJobProgress(supabase, job.id, 'processing', 20, 'Aplicando mapeamentos existentes...');

  // Here you would implement the mapping logic similar to your current code
  // For now, we'll simulate the process

  // Step 2: Categorize with AI (30-70%)
  logger.info('Categorizing with AI', { jobId: job.id });
  await updateJobProgress(supabase, job.id, 'processing', 40, 'Categorizando com IA...');

  // Call Gemini AI for categorization (simulate)
  // const { data: aiResults } = await supabase.functions.invoke('gemini-categorize-transactions', {
  //   body: { transactions: unmappedTransactions }
  // });

  // Step 3: Save to database (70-90%)
  logger.info('Saving to database', { jobId: job.id });
  await updateJobProgress(supabase, job.id, 'processing', 70, 'Salvando no banco de dados...');

  // Implement database save logic based on layoutType
  let imported = 0;
  const errors: string[] = [];

  if (payload.layoutType === 'credit_card') {
    // Process credit card transactions
    for (const transaction of payload.transactions) {
      try {
        const transactionData = {
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
        };

        // Check if transaction already exists
        const { data: existingTransaction, error: checkError } = await supabase
          .from('transaction_credit')
          .select('id')
          .eq('external_id', transaction.id)
          .maybeSingle();
        
        if (checkError) {
          logger.error('Error checking existing credit transaction', { jobId: job.id, transactionId: transaction.id, error: checkError });
          errors.push(`Error checking transaction ${transaction.description}: ${checkError.message}`);
          continue;
        }
        
        let result;
        if (existingTransaction) {
          // Update existing transaction
          const { data, error } = await supabase
            .from('transaction_credit')
            .update(transactionData)
            .eq('external_id', transaction.id)
            .select();
          
          if (error) {
            logger.error('Error updating credit transaction', { jobId: job.id, transactionId: transaction.id, error });
            errors.push(`Error saving transaction ${transaction.description}: ${error.message}`);
            continue;
          }
          result = data;
        } else {
          // Insert new transaction
          const { data, error } = await supabase
            .from('transaction_credit')
            .insert(transactionData)
            .select();
          
          if (error) {
            logger.error('Error inserting credit transaction', { jobId: job.id, transactionId: transaction.id, error });
            errors.push(`Error saving transaction ${transaction.description}: ${error.message}`);
            continue;
          }
          result = data;
        }
        
        imported++;
      } catch (error) {
        logger.error('Exception saving credit transaction', { 
          jobId: job.id, 
          transactionId: transaction.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        errors.push(`Error saving transaction ${transaction.description}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } else {
    // Process bank transactions
    for (const transaction of payload.transactions) {
      try {
        const transactionData = {
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
        };

        // Check if transaction already exists
        const { data: existingTransaction, error: checkError } = await supabase
          .from('transactions')
          .select('id')
          .eq('external_id', transaction.id)
          .maybeSingle();
        
        if (checkError) {
          logger.error('Error checking existing bank transaction', { jobId: job.id, transactionId: transaction.id, error: checkError });
          errors.push(`Error checking transaction ${transaction.description}: ${checkError.message}`);
          continue;
        }
        
        let result;
        if (existingTransaction) {
          // Update existing transaction
          const { data, error } = await supabase
            .from('transactions')
            .update(transactionData)
            .eq('external_id', transaction.id)
            .select();
          
          if (error) {
            logger.error('Error updating bank transaction', { jobId: job.id, transactionId: transaction.id, error });
            errors.push(`Error saving transaction ${transaction.description}: ${error.message}`);
            continue;
          }
          result = data;
        } else {
          // Insert new transaction
          const { data, error } = await supabase
            .from('transactions')
            .insert(transactionData)
            .select();
          
          if (error) {
            logger.error('Error inserting bank transaction', { jobId: job.id, transactionId: transaction.id, error });
            errors.push(`Error saving transaction ${transaction.description}: ${error.message}`);
            continue;
          }
          result = data;
        }
        
        imported++;
      } catch (error) {
        logger.error('Exception saving bank transaction', { 
          jobId: job.id, 
          transactionId: transaction.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        errors.push(`Error saving transaction ${transaction.description}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Step 4: Update mappings (90-100%)
  logger.info('Updating mappings', { jobId: job.id });
  await updateJobProgress(supabase, job.id, 'processing', 90, 'Atualizando mapeamentos...');

  // Here you would update transaction mappings for future use
  // Similar to your current mapping update logic

  const result = {
    imported,
    skipped: payload.transactions.length - imported,
    errors,
    total: payload.transactions.length
  };

  logger.info('Import job completed', { jobId: job.id, result });
  return result;
}

// Function to ensure completion notification is created (backup in case trigger fails)
async function ensureCompletionNotification(supabase: any, job: BackgroundJob, result: any) {
  try {
    logger.info('Ensuring completion notification exists', { jobId: job.id });
    
    // Wait a moment to let the trigger fire first
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if notification already exists (created by trigger)
    const { data: existingNotification, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('related_entity_id', job.id)
      .eq('related_entity_type', 'background_job')
      .eq('type', 'success')
      .maybeSingle();
    
    if (existingNotification) {
      logger.info('Notification already exists from trigger', { jobId: job.id, notificationId: existingNotification.id });
      return;
    }
    
    logger.warn('No notification found, creating backup notification', { jobId: job.id });
    
    // Create backup notification
    const title = job.type === 'transaction_import' ? 'Importação Concluída' : 'Processamento Concluído';
    const message = job.type === 'transaction_import' 
      ? `Suas transações foram importadas com sucesso. ${result.imported || 0} transações processadas.`
      : 'Seu processamento foi concluído com sucesso.';
    
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        title: title,
        message: message,
        type: 'success',
        category: 'background_job',
        related_entity_type: 'background_job',
        related_entity_id: job.id,
        data: {
          job_type: job.type,
          job_status: 'completed',
          progress: 100,
          result: result,
          created_by: 'edge_function_backup'
        }
      });
    
    if (insertError) {
      logger.error('Failed to create backup notification', { jobId: job.id, error: insertError });
    } else {
      logger.info('Backup notification created successfully', { jobId: job.id });
    }
  } catch (error) {
    logger.error('Error in ensureCompletionNotification', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
