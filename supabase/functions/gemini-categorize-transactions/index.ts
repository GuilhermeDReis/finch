
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  date: string;
  description: string;
  amount: number;
  payment_method: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface AIResponse {
  transaction_index: number;
  category_id: string;
  subcategory_id: string | null;
  confidence: number;
  reasoning: string;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Reduced from 2000ms
const BACKOFF_MULTIPLIER = 1.5; // Reduced from 2

// Sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced transaction type detection
function detectTransactionType(transaction: Transaction): 'income' | 'expense' {
  const { description, amount } = transaction;
  const desc = description.toLowerCase();
  
  // Income indicators (high priority)
  const incomePatterns = [
    'salario', 'salário', 'rendimento', 'pix recebido', 'transferencia recebida',
    'deposito', 'depósito', 'credito em conta', 'crédito em conta',
    'reembolso', 'devolução', 'restituição', 'freelance', 'comissão',
    'rendimento', 'juros', 'dividendos', 'bonificação', '13º salário',
    'venda', 'recebimento', 'entrada'
  ];
  
  // Expense indicators
  const expensePatterns = [
    'compra', 'pagamento', 'debito', 'débito', 'saque', 'transferencia',
    'pix enviado', 'cartao', 'cartão', 'boleto', 'financiamento',
    'prestação', 'mensalidade', 'anuidade', 'taxa', 'juros',
    'multa', 'tarifa', 'desconto', 'cobrança'
  ];
  
  // Check for income patterns first
  for (const pattern of incomePatterns) {
    if (desc.includes(pattern)) {
      console.log(`🔍 [TYPE_DETECTION] Income pattern "${pattern}" found in: ${description}`);
      return 'income';
    }
  }
  
  // Check for expense patterns
  for (const pattern of expensePatterns) {
    if (desc.includes(pattern)) {
      console.log(`🔍 [TYPE_DETECTION] Expense pattern "${pattern}" found in: ${description}`);
      return 'expense';
    }
  }
  
  // Fallback to amount-based detection
  const detectedType = amount >= 0 ? 'income' : 'expense';
  console.log(`🔍 [TYPE_DETECTION] No pattern found, using amount-based detection: ${detectedType} for ${description}`);
  return detectedType;
}

// Function to call Gemini API with retry logic
async function callGeminiWithRetry(prompt: string, geminiApiKey: string, retryCount = 0): Promise<any> {
  try {
    console.log(`🤖 [GEMINI] Tentativa ${retryCount + 1}/${MAX_RETRIES + 1}...`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2, // Reduced for more consistent results
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [GEMINI] Error - Status: ${response.status}, Response: ${errorText}`);
      
      if ((response.status === 503 || response.status === 429) && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
        console.log(`⏳ [GEMINI] Retrying in ${delay}ms...`);
        await sleep(delay);
        return callGeminiWithRetry(prompt, geminiApiKey, retryCount + 1);
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const geminiResponse = await response.json();
    console.log(`✅ [GEMINI] Success on attempt ${retryCount + 1}`);
    return geminiResponse;

  } catch (error) {
    console.error(`❌ [GEMINI] Error on attempt ${retryCount + 1}:`, error);
    
    if (retryCount < MAX_RETRIES && (
      error.message.includes('fetch') || 
      error.message.includes('network') || 
      error.message.includes('timeout')
    )) {
      const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
      console.log(`⏳ [GEMINI] Network error, retrying in ${delay}ms...`);
      await sleep(delay);
      return callGeminiWithRetry(prompt, geminiApiKey, retryCount + 1);
    }
    
    throw error;
  }
}

// Enhanced fallback categorization with Brazilian context
function createEnhancedFallbackSuggestions(
  transactions: Transaction[], 
  categories: Category[]
): AIResponse[] {
  console.log('🔄 [FALLBACK] Applying enhanced fallback categorization...');
  
  return transactions.map((transaction, index) => {
    const description = transaction.description.toLowerCase();
    const transactionType = detectTransactionType(transaction);
    
    // Get categories of the correct type
    const correctTypeCategories = categories.filter(cat => cat.type === transactionType);
    
    // Enhanced Brazilian keyword matching
    let selectedCategory = correctTypeCategories.find(cat => 
      cat.name.toLowerCase().includes('outros') || 
      cat.name.toLowerCase().includes('diversos')
    );
    
    let confidence = 0.4;
    let reasoning = 'Categorização automática de fallback';
    
    // Enhanced pattern matching for Brazilian context
    const patterns = [
      // Income patterns
      { keywords: ['salario', 'salário', 'rendimento'], category: 'salário', type: 'income', confidence: 0.8 },
      { keywords: ['pix recebido', 'transferencia recebida'], category: 'receita', type: 'income', confidence: 0.7 },
      { keywords: ['deposito', 'depósito', 'credito em conta'], category: 'receita', type: 'income', confidence: 0.6 },
      
      // Expense patterns
      { keywords: ['supermercado', 'mercado', 'padaria', 'açougue'], category: 'alimentação', type: 'expense', confidence: 0.7 },
      { keywords: ['posto', 'combustível', 'gasolina', 'etanol'], category: 'transporte', type: 'expense', confidence: 0.8 },
      { keywords: ['farmacia', 'farmácia', 'medicamento', 'remedio'], category: 'saúde', type: 'expense', confidence: 0.8 },
      { keywords: ['restaurante', 'lanchonete', 'ifood', 'uber eats'], category: 'alimentação', type: 'expense', confidence: 0.7 },
      { keywords: ['shopping', 'loja', 'magazine', 'americanas'], category: 'compras', type: 'expense', confidence: 0.6 },
      { keywords: ['academia', 'ginásio', 'personal'], category: 'saúde', type: 'expense', confidence: 0.7 },
      { keywords: ['netflix', 'spotify', 'amazon prime'], category: 'entretenimento', type: 'expense', confidence: 0.9 },
      { keywords: ['uber', 'taxi', '99', 'transporte'], category: 'transporte', type: 'expense', confidence: 0.8 },
      { keywords: ['conta de luz', 'energia', 'cemig', 'copel'], category: 'utilidades', type: 'expense', confidence: 0.9 },
      { keywords: ['água', 'saneamento', 'sabesp'], category: 'utilidades', type: 'expense', confidence: 0.9 },
      { keywords: ['telefone', 'celular', 'internet', 'vivo', 'tim', 'claro'], category: 'utilidades', type: 'expense', confidence: 0.8 },
    ];
    
    // Try to find a matching pattern
    for (const pattern of patterns) {
      if (pattern.type === transactionType) {
        for (const keyword of pattern.keywords) {
          if (description.includes(keyword)) {
            // Find category that matches the pattern
            const matchedCategory = correctTypeCategories.find(cat => 
              cat.name.toLowerCase().includes(pattern.category) ||
              cat.name.toLowerCase().includes(keyword)
            );
            
            if (matchedCategory) {
              selectedCategory = matchedCategory;
              confidence = pattern.confidence;
              reasoning = `Detectado "${keyword}" - padrão brasileiro para ${pattern.category}`;
              break;
            }
          }
        }
        if (confidence > 0.4) break; // Found a good match
      }
    }
    
    // Fallback to first category of correct type if no other match
    if (!selectedCategory && correctTypeCategories.length > 0) {
      selectedCategory = correctTypeCategories[0];
      confidence = 0.3;
      reasoning = `Categoria padrão para ${transactionType}`;
    }
    
    console.log(`🎯 [FALLBACK] Transaction ${index}: ${description} -> ${selectedCategory?.name || 'N/A'} (${confidence})`);
    
    return {
      transaction_index: index,
      category_id: selectedCategory?.id || categories[0]?.id || '',
      subcategory_id: null,
      confidence: confidence,
      reasoning: reasoning
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, categories, subcategories } = await req.json();
    
    console.log('📥 [REQUEST] Received:', { 
      transactionCount: transactions?.length,
      categoryCount: categories?.length,
      subcategoryCount: subcategories?.length 
    });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Detect transaction types for better accuracy
    const transactionsWithType = transactions.map((transaction: Transaction) => ({
      ...transaction,
      detectedType: detectTransactionType(transaction)
    }));

    let aiSuggestions: AIResponse[] = [];
    let usedFallback = false;

    try {
      // Build optimized prompt focusing on Brazilian context
      const incomeCategories = categories.filter((cat: Category) => cat.type === 'income');
      const expenseCategories = categories.filter((cat: Category) => cat.type === 'expense');

      const prompt = `Você é um especialista em categorização de transações financeiras BRASILEIRAS.

CATEGORIAS DISPONÍVEIS:

RECEITAS:
${incomeCategories.map((cat: Category) => `${cat.id}: ${cat.name}`).join('\n')}

GASTOS:
${expenseCategories.map((cat: Category) => `${cat.id}: ${cat.name}`).join('\n')}

SUBCATEGORIAS:
${categories.map((cat: Category) => {
  const catSubcategories = subcategories.filter((sub: Subcategory) => sub.category_id === cat.id);
  return `${cat.name}:\n${catSubcategories.map((sub: Subcategory) => `  ${sub.id}: ${sub.name}`).join('\n')}`;
}).join('\n\n')}

TRANSAÇÕES PARA ANÁLISE:
${transactionsWithType.map((t: any, index: number) => 
  `${index}: ${t.description} | R$ ${t.amount.toFixed(2)} | ${t.detectedType.toUpperCase()} | ${t.date}`
).join('\n')}

INSTRUÇÕES IMPORTANTES:
1. Analise estabelecimentos e padrões BRASILEIROS (bancos, lojas, serviços)
2. Para RECEITAS, use APENAS categorias de receita. Para GASTOS, use APENAS categorias de gasto
3. Seja CONFIANTE nas suas sugestões - use confiança acima de 0.6 quando tiver certeza
4. Considere contexto brasileiro: PIX, bancos nacionais, redes de supermercados, etc.
5. Se não conseguir identificar com alta confiança, use categoria "Outros" mas mantenha confiança mínima de 0.4

RESPONDA APENAS COM JSON:
[
  {
    "transaction_index": 0,
    "category_id": "uuid-da-categoria",
    "subcategory_id": "uuid-ou-null",
    "confidence": 0.75,
    "reasoning": "Explicação clara e concisa"
  }
]`;

      console.log('🤖 [AI] Sending request to Gemini...');
      
      const geminiResponse = await callGeminiWithRetry(prompt, geminiApiKey);

      if (geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
        const responseText = geminiResponse.candidates[0].content.parts[0].text;
        console.log('📝 [AI] Raw response:', responseText.substring(0, 300) + '...');
        
        try {
          // Extract JSON from response
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            aiSuggestions = JSON.parse(jsonMatch[0]);
            console.log(`✅ [AI] Parsed ${aiSuggestions.length} suggestions successfully`);
          } else {
            throw new Error('No JSON array found in response');
          }
        } catch (parseError) {
          console.error('❌ [AI] Parse error:', parseError);
          throw new Error('Failed to parse AI response');
        }
      } else {
        throw new Error('Invalid response format from Gemini API');
      }

    } catch (geminiError) {
      console.error('⚠️ [AI] Gemini API failed:', geminiError);
      console.log('🔄 [FALLBACK] Using enhanced fallback system...');
      
      aiSuggestions = createEnhancedFallbackSuggestions(transactions, categories);
      usedFallback = true;
    }

    // Enhanced validation with better recovery
    const validatedSuggestions = aiSuggestions.map((suggestion, index) => {
      const transaction = transactionsWithType[index];
      const expectedType = transaction.detectedType;
      
      // Check if suggested category exists and matches expected type
      const suggestedCategory = categories.find((cat: Category) => 
        cat.id === suggestion.category_id
      );
      
      if (!suggestedCategory) {
        console.warn(`⚠️ [VALIDATION] Category ${suggestion.category_id} not found for transaction ${index}`);
        
        // Find fallback category of correct type
        const fallbackCategory = categories.find((cat: Category) => 
          cat.type === expectedType && (
            cat.name.toLowerCase().includes('outros') || 
            cat.name.toLowerCase().includes('diversos')
          )
        ) || categories.find((cat: Category) => cat.type === expectedType);
        
        suggestion.category_id = fallbackCategory?.id || categories[0]?.id || '';
        suggestion.confidence = Math.max(0.3, suggestion.confidence * 0.5);
        suggestion.reasoning = 'Categoria original não encontrada, usando fallback';
      } else if (suggestedCategory.type !== expectedType) {
        console.warn(`⚠️ [VALIDATION] Type mismatch for transaction ${index}: expected ${expectedType}, got ${suggestedCategory.type}`);
        
        // Find category of correct type
        const correctTypeCategory = categories.find((cat: Category) => 
          cat.type === expectedType && (
            cat.name.toLowerCase().includes('outros') || 
            cat.name.toLowerCase().includes('diversos')
          )
        ) || categories.find((cat: Category) => cat.type === expectedType);
        
        if (correctTypeCategory) {
          suggestion.category_id = correctTypeCategory.id;
          suggestion.confidence = Math.max(0.3, suggestion.confidence * 0.6);
          suggestion.reasoning = `Tipo ajustado para ${expectedType}`;
        }
      }

      // Validate subcategory
      if (suggestion.subcategory_id) {
        const subcategoryExists = subcategories.find((sub: Subcategory) => 
          sub.id === suggestion.subcategory_id && sub.category_id === suggestion.category_id
        );
        if (!subcategoryExists) {
          console.warn(`⚠️ [VALIDATION] Invalid subcategory ${suggestion.subcategory_id} for transaction ${index}`);
          suggestion.subcategory_id = null;
        }
      }

      // Ensure confidence is within valid range
      suggestion.confidence = Math.max(0.2, Math.min(1.0, suggestion.confidence || 0.5));

      return suggestion;
    });

    console.log(`✅ [SUCCESS] Processing complete: ${validatedSuggestions.length} suggestions`);
    console.log(`📊 [STATS] Average confidence: ${(validatedSuggestions.reduce((sum, s) => sum + s.confidence, 0) / validatedSuggestions.length).toFixed(2)}`);
    
    if (usedFallback) {
      console.log('⚠️ [FALLBACK] Enhanced fallback system was used');
    }

    return new Response(
      JSON.stringify({ 
        suggestions: validatedSuggestions,
        usedFallback: usedFallback,
        message: usedFallback ? 
          'Sistema de fallback inteligente aplicado' : 
          'Categorização por IA concluída com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 [ERROR] Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to categorize transactions', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
