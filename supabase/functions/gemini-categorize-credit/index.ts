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
    
    console.log('💳 [CREDIT-AI] Starting credit card categorization for', transactions.length, 'transactions');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get categories and subcategories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (categoriesError) {
      console.error('❌ [CREDIT-AI] Error loading categories:', categoriesError);
      throw categoriesError;
    }

    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('*');

    if (subcategoriesError) {
      console.error('❌ [CREDIT-AI] Error loading subcategories:', subcategoriesError);
      throw subcategoriesError;
    }

    console.log('📊 [CREDIT-AI] Loaded', categories.length, 'categories and', subcategories.length, 'subcategories');

    // Enhanced fallback patterns specific for credit card transactions
    const creditCardFallbackPatterns = [
      // Food and dining - high priority for credit cards
      { keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'padaria', 'cafeteria'], category: 'Alimentação', subcategory: 'Restaurante' },
      { keywords: ['supermercado', 'mercado', 'hortifruti', 'açougue'], category: 'Alimentação', subcategory: 'Supermercado' },
      { keywords: ['ifood', 'uber eats', 'delivery', 'rappi'], category: 'Alimentação', subcategory: 'Delivery' },
      { keywords: ['cafe', 'starbucks', 'cacau show'], category: 'Alimentação', subcategory: 'Café' },
      
      // Shopping - very common in credit cards
      { keywords: ['shopping', 'magazine', 'americanas', 'submarino', 'mercado livre'], category: 'Compras', subcategory: 'Online' },
      { keywords: ['zara', 'hm', 'c&a', 'renner', 'riachuelo'], category: 'Compras', subcategory: 'Roupas e Acessórios' },
      { keywords: ['farmacia', 'drogaria', 'drogasil', 'raia'], category: 'Saúde', subcategory: 'Medicamentos' },
      
      // Entertainment and services
      { keywords: ['cinema', 'teatro', 'show', 'ingresso'], category: 'Entretenimento', subcategory: 'Cinema/Teatro' },
      { keywords: ['netflix', 'spotify', 'amazon prime', 'disney'], category: 'Entretenimento', subcategory: 'Streaming' },
      { keywords: ['posto', 'gasolina', 'combustivel', 'shell', 'petrobras', 'ipiranga'], category: 'Transporte', subcategory: 'Combustível' },
      { keywords: ['uber', 'taxi', '99', 'cabify'], category: 'Transporte', subcategory: 'Transporte Público' },
      
      // Health & fitness
      { keywords: ['academia', 'gym', 'fitness', 'smart fit', 'bio ritmo'], category: 'Saúde', subcategory: 'Academia/Atividade Física' },
      { keywords: ['clinica', 'hospital', 'medico', 'dentista'], category: 'Saúde', subcategory: 'Consultas Médicas' },
      
      // Utilities & bills on credit card
      { keywords: ['telefone', 'celular', 'vivo', 'tim', 'claro', 'oi'], category: 'Contas', subcategory: 'Internet/Telefone' },
      { keywords: ['netflix', 'spotify', 'amazon', 'subscription'], category: 'Contas', subcategory: 'Assinaturas' },
      
      // Credit card specific
      { keywords: ['anuidade', 'tarifa', 'juros', 'iof'], category: 'Finanças', subcategory: 'Cartão de Crédito' },
      { keywords: ['pagamento', 'credito pago', 'quitacao'], category: 'Finanças', subcategory: 'Pagamento Cartão' },
      
      // Travel
      { keywords: ['hotel', 'pousada', 'booking', 'airbnb'], category: 'Viagem', subcategory: 'Hospedagem' },
      { keywords: ['passagem', 'aviao', 'onibus', 'rodoviaria'], category: 'Viagem', subcategory: 'Transporte' }
    ];

    // Helper function to use fallback patterns for credit cards
    const categorizeWithCreditFallback = (transaction: any) => {
      const description = transaction.description.toLowerCase();
      
      // Try credit card specific patterns first
      for (const pattern of creditCardFallbackPatterns) {
        if (pattern.keywords.some(keyword => description.includes(keyword))) {
          const category = categories.find(cat => cat.name === pattern.category);
          const subcategory = subcategories.find(sub => 
            sub.name === pattern.subcategory && sub.category_id === category?.id
          );
          
          if (category && subcategory) {
            console.log('✅ [CREDIT-AI] Credit fallback match for', transaction.description, '→', pattern.category, '/', pattern.subcategory);
            return {
              id: transaction.id,
              categoryId: category.id,
              subcategoryId: subcategory.id,
              confidence: 0.8, // Higher confidence for credit card patterns
              reasoning: `Categorizado por padrão de cartão de crédito: ${pattern.keywords.find(k => description.includes(k))}`,
              isAISuggested: true,
              usedFallback: true
            };
          }
        }
      }
      
      // If no credit card specific match, use default
      const defaultCategory = categories.find(cat => cat.name === 'Compras');
      const defaultSubcategory = subcategories.find(sub => 
        sub.name === 'Diversos' && sub.category_id === defaultCategory?.id
      );
      
      return {
        id: transaction.id,
        categoryId: defaultCategory?.id,
        subcategoryId: defaultSubcategory?.id,
        confidence: 0.3,
        reasoning: 'Categoria padrão para cartão de crédito - não encontrado padrão específico',
        isAISuggested: true,
        usedFallback: true
      };
    };

    // Try to use Gemini AI first
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    let categorizedTransactions: any[] = [];

    if (geminiApiKey) {
      try {
        console.log('🤖 [CREDIT-AI] Attempting Gemini AI categorization for credit card transactions');
        
        // Prepare categories and subcategories for Gemini
        const categoryData = categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          subcategories: subcategories.filter(sub => sub.category_id === cat.id).map(sub => ({
            id: sub.id,
            name: sub.name
          }))
        }));

        // Filter out negative amounts (bill payments) and prepare transactions for Gemini (limit to avoid token limits)
        const transactionsForAI = transactions
          .filter((t: any) => t.amount >= 0) // Only positive amounts (actual purchases)
          .slice(0, 50)
          .map((t: any) => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type
          }));

        const prompt = `
Você é um assistente de categorização financeira especializado em transações de CARTÃO DE CRÉDITO. Categorize as seguintes transações usando as categorias e subcategorias fornecidas.

CONTEXTO IMPORTANTE:
- Estas são transações de CARTÃO DE CRÉDITO
- Valores negativos representam PAGAMENTOS (redução da dívida) - devem ser categorizados como "Finanças > Pagamento Cartão"
- Valores positivos representam GASTOS/COMPRAS normais do cartão

CATEGORIAS E SUBCATEGORIAS DISPONÍVEIS:
${JSON.stringify(categoryData, null, 2)}

TRANSAÇÕES DE CARTÃO DE CRÉDITO PARA CATEGORIZAR:
${JSON.stringify(transactionsForAI, null, 2)}

INSTRUÇÕES ESPECÍFICAS PARA CARTÃO DE CRÉDITO:
1. Para cada transação, escolha a categoria e subcategoria mais apropriada
2. VALORES NEGATIVOS = Pagamentos da fatura → "Finanças > Pagamento Cartão"
3. VALORES POSITIVOS = Gastos/compras → categorize pela natureza da compra
4. Priorize categorias de consumo típicas de cartão: Alimentação, Compras, Entretenimento, Saúde
5. Considere estabelecimentos e descrições típicas do Brasil
6. Use sua experiência com transações financeiras brasileiras
7. Retorne APENAS um array JSON válido com o formato:
[
  {
    "id": "transaction_id",
    "categoryId": "category_uuid",
    "subcategoryId": "subcategory_uuid",
    "confidence": 0.95,
    "reasoning": "Explicação breve da categorização específica para cartão de crédito"
  }
]

IMPORTANTE: Retorne apenas o JSON, sem texto adicional.
`;

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 0.8,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (geminiText) {
            try {
              // Clean up the response to extract JSON
              const cleanedText = geminiText.replace(/```json\n?|\n?```/g, '').trim();
              const geminiResults = JSON.parse(cleanedText);
              
              console.log('✅ [CREDIT-AI] Gemini AI categorization successful for', geminiResults.length, 'credit transactions');
              
              // Process all transactions with Gemini results + fallback for remaining
              categorizedTransactions = transactions.map((transaction: any) => {
                // Skip categorization for negative amounts (bill payments)
                if (transaction.amount < 0) {
                  return {
                    id: transaction.id,
                    categoryId: undefined,
                    subcategoryId: undefined,
                    confidence: 0,
                    reasoning: 'Pagamento de fatura - não categorizado',
                    isAISuggested: false,
                    usedFallback: false
                  };
                }
                
                const geminiResult = geminiResults.find((r: any) => r.id === transaction.id);
                
                if (geminiResult) {
                  return {
                    ...geminiResult,
                    isAISuggested: true,
                    usedFallback: false
                  };
                } else {
                  // Use credit card specific fallback for transactions not processed by Gemini
                  return categorizeWithCreditFallback(transaction);
                }
              });
              
            } catch (parseError) {
              console.error('❌ [CREDIT-AI] Error parsing Gemini response:', parseError);
              throw parseError;
            }
          } else {
            throw new Error('Empty response from Gemini');
          }
        } else {
          throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }
      } catch (geminiError) {
        console.error('❌ [CREDIT-AI] Gemini AI failed, falling back to credit card patterns:', geminiError);
        
        // Fallback to credit card specific pattern-based categorization
        categorizedTransactions = transactions.map(categorizeWithCreditFallback);
      }
    } else {
      console.log('⚠️ [CREDIT-AI] No Gemini API key found, using credit card fallback patterns');
      
      // Use credit card specific fallback patterns only
      categorizedTransactions = transactions.map(categorizeWithCreditFallback);
    }

    console.log('✅ [CREDIT-AI] Credit card categorization completed for', categorizedTransactions.length, 'transactions');

    return new Response(JSON.stringify(categorizedTransactions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 [CREDIT-AI] Error in credit card categorization:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
