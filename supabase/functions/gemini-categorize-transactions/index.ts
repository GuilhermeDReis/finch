
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

    // Helper function to use fallback patterns
    const categorizewithFallback = (transaction: any) => {
      const description = transaction.description.toLowerCase();
      
      // Try fallback patterns first
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
              confidence: 0.75,
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
      
      return {
        id: transaction.id,
        categoryId: defaultCategory?.id,
        subcategoryId: defaultSubcategory?.id,
        confidence: 0.3,
        reasoning: 'Categoria padrão - não encontrado padrão específico',
        isAISuggested: true,
        usedFallback: true
      };
    };

    // Try to use Gemini AI first
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    let categorizedTransactions: any[] = [];

    if (geminiApiKey) {
      try {
        console.log('🤖 [AI] Attempting Gemini AI categorization');
        
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

        // Prepare transactions for Gemini (limit to avoid token limits)
        const transactionsForAI = transactions.slice(0, 50).map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type
        }));

        const prompt = `
Você é um assistente de categorização financeira. Categorize as seguintes transações usando as categorias e subcategorias fornecidas.

CATEGORIAS E SUBCATEGORIAS DISPONÍVEIS:
${JSON.stringify(categoryData, null, 2)}

TRANSAÇÕES PARA CATEGORIZAR:
${JSON.stringify(transactionsForAI, null, 2)}

INSTRUÇÕES:
1. Para cada transação, escolha a categoria e subcategoria mais apropriada
2. Considere o contexto da descrição, valor e tipo da transação
3. Use sua experiência com transações financeiras brasileiras
4. Retorne APENAS um array JSON válido com o formato:
[
  {
    "id": "transaction_id",
    "categoryId": "category_uuid",
    "subcategoryId": "subcategory_uuid",
    "confidence": 0.95,
    "reasoning": "Explicação breve da categorização"
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
              
              console.log('✅ [AI] Gemini AI categorization successful for', geminiResults.length, 'transactions');
              
              // Process all transactions with Gemini results + fallback for remaining
              categorizedTransactions = transactions.map((transaction: any) => {
                const geminiResult = geminiResults.find((r: any) => r.id === transaction.id);
                
                if (geminiResult) {
                  return {
                    ...geminiResult,
                    isAISuggested: true,
                    usedFallback: false
                  };
                } else {
                  // Use fallback for transactions not processed by Gemini
                  return categorizewithFallback(transaction);
                }
              });
              
            } catch (parseError) {
              console.error('❌ [AI] Error parsing Gemini response:', parseError);
              throw parseError;
            }
          } else {
            throw new Error('Empty response from Gemini');
          }
        } else {
          throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }
      } catch (geminiError) {
        console.error('❌ [AI] Gemini AI failed, falling back to patterns:', geminiError);
        
        // Fallback to pattern-based categorization
        categorizedTransactions = transactions.map(categorizewithFallback);
      }
    } else {
      console.log('⚠️ [AI] No Gemini API key found, using fallback patterns');
      
      // Use fallback patterns only
      categorizedTransactions = transactions.map(categorizewithFallback);
    }

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
