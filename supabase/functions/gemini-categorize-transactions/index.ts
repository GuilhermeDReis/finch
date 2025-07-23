
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
    const { transactions } = await req.json();
    
    console.log('🤖 [AI] Starting categorization for', transactions.length, 'transactions');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get categories and subcategories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (categoriesError) {
      console.error('❌ [AI] Error loading categories:', categoriesError);
      throw categoriesError;
    }

    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('*');

    if (subcategoriesError) {
      console.error('❌ [AI] Error loading subcategories:', subcategoriesError);
      throw subcategoriesError;
    }

    console.log('📊 [AI] Loaded', categories.length, 'categories and', subcategories.length, 'subcategories');

    // Create category mapping for faster lookups
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    const subcategoryMap = new Map(subcategories.map(sub => [sub.id, sub]));

    // Enhanced fallback patterns with Academia fix
    const fallbackPatterns = [
      // Health and fitness - prioritize ACADEMIA
      { keywords: ['academia', 'gym', 'fitness', 'musculação', 'personal'], category: 'Saúde', subcategory: 'Academia/Atividade Física' },
      { keywords: ['farmacia', 'drogaria', 'medicamento', 'remedio'], category: 'Saúde', subcategory: 'Medicamentos' },
      { keywords: ['hospital', 'clinica', 'medico', 'consulta'], category: 'Saúde', subcategory: 'Consultas Médicas' },
      { keywords: ['dentista', 'odontologia'], category: 'Saúde', subcategory: 'Consultas Médicas' },
      
      // Food and dining
      { keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburgueria'], category: 'Alimentação', subcategory: 'Restaurante' },
      { keywords: ['supermercado', 'mercado', 'padaria'], category: 'Alimentação', subcategory: 'Supermercado' },
      { keywords: ['ifood', 'uber eats', 'delivery'], category: 'Alimentação', subcategory: 'Delivery' },
      { keywords: ['cafe', 'cafeteria', 'starbucks'], category: 'Alimentação', subcategory: 'Café' },
      
      // Transportation
      { keywords: ['posto', 'gasolina', 'combustivel', 'shell', 'petrobras'], category: 'Transporte', subcategory: 'Combustível' },
      { keywords: ['uber', 'taxi', '99', 'transporte'], category: 'Transporte', subcategory: 'Transporte Público' },
      { keywords: ['estacionamento', 'parking'], category: 'Transporte', subcategory: 'Estacionamento' },
      
      // Shopping
      { keywords: ['shopping', 'loja', 'magazine', 'americanas'], category: 'Compras', subcategory: 'Roupas e Acessórios' },
      { keywords: ['amazon', 'mercado livre', 'aliexpress'], category: 'Compras', subcategory: 'Online' },
      
      // Entertainment
      { keywords: ['cinema', 'teatro', 'show'], category: 'Entretenimento', subcategory: 'Cinema/Teatro' },
      { keywords: ['netflix', 'spotify', 'streaming'], category: 'Entretenimento', subcategory: 'Streaming' },
      
      // Bills and utilities
      { keywords: ['energia', 'luz', 'elektro', 'cpfl'], category: 'Contas', subcategory: 'Energia' },
      { keywords: ['agua', 'saneamento', 'sabesp'], category: 'Contas', subcategory: 'Água' },
      { keywords: ['internet', 'telefone', 'celular', 'vivo', 'tim', 'claro'], category: 'Contas', subcategory: 'Internet/Telefone' },
      
      // Banking and finance
      { keywords: ['banco', 'caixa', 'bradesco', 'itau', 'santander'], category: 'Finanças', subcategory: 'Taxas Bancárias' },
      { keywords: ['cartao', 'anuidade'], category: 'Finanças', subcategory: 'Cartão de Crédito' },
      
      // Income
      { keywords: ['salario', 'pagamento', 'rendimento'], category: 'Renda', subcategory: 'Salário' },
      { keywords: ['pix recebido', 'transferencia recebida'], category: 'Renda', subcategory: 'Transferências' }
    ];

    // Process transactions with enhanced fallback
    const categorizedTransactions = transactions.map((transaction: any) => {
      const description = transaction.description.toLowerCase();
      
      // Try fallback patterns first (prioritizing ACADEMIA)
      for (const pattern of fallbackPatterns) {
        if (pattern.keywords.some(keyword => description.includes(keyword))) {
          const category = categories.find(cat => cat.name === pattern.category);
          const subcategory = subcategories.find(sub => 
            sub.name === pattern.subcategory && sub.category_id === category?.id
          );
          
          if (category && subcategory) {
            console.log('✅ [AI] Fallback match for', transaction.description, '→', pattern.category, '/', pattern.subcategory);
            return {
              id: transaction.id,
              categoryId: category.id,
              subcategoryId: subcategory.id,
              confidence: 0.8,
              reasoning: `Categorizado por padrão: ${pattern.keywords.find(k => description.includes(k))}`,
              isAISuggested: true,
              usedFallback: true
            };
          }
        }
      }
      
      // If no fallback match, use default categorization
      const defaultCategory = categories.find(cat => cat.name === 'Outros');
      const defaultSubcategory = subcategories.find(sub => 
        sub.name === 'Diversos' && sub.category_id === defaultCategory?.id
      );
      
      console.log('⚠️ [AI] No pattern match for', transaction.description, '→ using default category');
      
      return {
        id: transaction.id,
        categoryId: defaultCategory?.id,
        subcategoryId: defaultSubcategory?.id,
        confidence: 0.3,
        reasoning: 'Categoria padrão - não encontrado padrão específico',
        isAISuggested: true,
        usedFallback: true
      };
    });

    console.log('✅ [AI] Categorization completed for', categorizedTransactions.length, 'transactions');

    return new Response(JSON.stringify(categorizedTransactions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 [AI] Error in categorization:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
