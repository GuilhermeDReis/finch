
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
  suggested_type?: string; // New field for type correction
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 1.5;

// Sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced transaction type detection (unified with CSVUploader)
function detectTransactionType(transaction: Transaction): 'income' | 'expense' {
  const { description, amount } = transaction;
  const desc = description.toLowerCase();
  
  console.log(`🔍 [TYPE_DETECTION] Analyzing: "${description}" (amount: ${amount})`);
  
  // Priority 1: Known Brazilian companies/services (always expense when "enviada")
  const knownExpenseCompanies = [
    'uber', '99', 'taxi', 'ifood', 'rappi', 'delivery', 'd market', 'd.market',
    'emporio km', 'casa da sopa', 'navenda', 'americanas', 'magazine luiza',
    'mercado livre', 'shopee', 'amazon', 'netshoes', 'centauro', 'ponto frio',
    'casas bahia', 'extra', 'carrefour', 'pao de acucar', 'big', 'bompreco',
    'posto', 'shell', 'petrobras', 'ipiranga', 'ale', 'texaco',
    'farmacia', 'drogaria', 'drogasil', 'droga raia', 'pacheco',
    'academia', 'smartfit', 'bioritmo', 'bodytech',
    'netflix', 'spotify', 'amazon prime', 'disney+', 'globoplay',
    'stone', 'pagseguro', 'mercado pago', 'paypal', 'picpay',
    'nubank', 'inter', 'neon', 'c6 bank', 'original'
  ];

  // Priority 2: Transaction context patterns (higher priority than companies)
  const contextPatterns = {
    income: [
      'recebido', 'recebimento', 'entrada', 'credito em conta', 'crédito em conta',
      'deposito', 'depósito', 'transferencia recebida', 'transferência recebida',
      'estorno', 'devolução', 'reembolso', 'restituição', 'pix recebido',
      'salario', 'salário', 'rendimento', 'dividendos', 'juros recebidos',
      'freelance', 'comissão', 'venda', 'bonificação', '13º salário'
    ],
    expense: [
      'enviada', 'enviado', 'pagamento', 'compra', 'debito', 'débito',
      'saque', 'pix enviado', 'transferencia enviada', 'transferência enviada',
      'cartao', 'cartão', 'boleto', 'financiamento', 'prestação',
      'mensalidade', 'anuidade', 'taxa', 'tarifa', 'multa', 'cobrança',
      'desconto em folha', 'fatura'
    ]
  };

  // Check context patterns first (highest priority)
  for (const pattern of contextPatterns.income) {
    if (desc.includes(pattern)) {
      console.log(`💰 [TYPE_DETECTION] Income context pattern "${pattern}" found → income`);
      return 'income';
    }
  }

  for (const pattern of contextPatterns.expense) {
    if (desc.includes(pattern)) {
      console.log(`💸 [TYPE_DETECTION] Expense context pattern "${pattern}" found → expense`);
      return 'expense';
    }
  }

  // Check for known expense companies
  for (const company of knownExpenseCompanies) {
    if (desc.includes(company)) {
      console.log(`🏢 [TYPE_DETECTION] Known expense company "${company}" found → expense`);
      return 'expense';
    }
  }

  // Fallback to amount-based detection (but be more careful with zero values)
  if (amount === 0) {
    console.log(`⚠️ [TYPE_DETECTION] Zero amount, defaulting to expense`);
    return 'expense';
  }
  
  const detectedType = amount > 0 ? 'income' : 'expense';
  console.log(`🔢 [TYPE_DETECTION] Amount-based detection: ${detectedType} (${amount})`);
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
          temperature: 0.2,
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

// Enhanced fallback categorization with better Brazilian context
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
    
    // Enhanced Brazilian keyword matching with specific companies
    const companyPatterns = [
      // Food & Delivery
      { keywords: ['ifood', 'rappi', 'uber eats', 'delivery'], category: 'alimentação', type: 'expense', confidence: 0.9 },
      { keywords: ['d market', 'd.market', 'emporio km', 'casa da sopa'], category: 'alimentação', type: 'expense', confidence: 0.8 },
      { keywords: ['supermercado', 'mercado', 'padaria', 'açougue'], category: 'alimentação', type: 'expense', confidence: 0.7 },
      
      // Transport
      { keywords: ['uber', '99', 'taxi', 'cabify'], category: 'transporte', type: 'expense', confidence: 0.9 },
      { keywords: ['posto', 'combustível', 'gasolina', 'etanol'], category: 'transporte', type: 'expense', confidence: 0.8 },
      
      // Shopping
      { keywords: ['americanas', 'magazine luiza', 'mercado livre'], category: 'compras', type: 'expense', confidence: 0.8 },
      { keywords: ['shopping', 'loja', 'netshoes', 'centauro'], category: 'compras', type: 'expense', confidence: 0.7 },
      
      // Health
      { keywords: ['farmacia', 'farmácia', 'drogaria', 'drogasil'], category: 'saúde', type: 'expense', confidence: 0.8 },
      { keywords: ['academia', 'smartfit', 'bioritmo', 'bodytech'], category: 'saúde', type: 'expense', confidence: 0.8 },
      
      // Entertainment
      { keywords: ['netflix', 'spotify', 'amazon prime', 'disney+'], category: 'entretenimento', type: 'expense', confidence: 0.9 },
      
      // Income patterns
      { keywords: ['salario', 'salário', 'rendimento'], category: 'salário', type: 'income', confidence: 0.8 },
      { keywords: ['freelance', 'comissão', 'venda'], category: 'receita', type: 'income', confidence: 0.7 },
      
      // Utilities
      { keywords: ['luz', 'energia', 'cemig', 'copel'], category: 'utilidades', type: 'expense', confidence: 0.9 },
      { keywords: ['água', 'saneamento', 'sabesp'], category: 'utilidades', type: 'expense', confidence: 0.9 },
      { keywords: ['telefone', 'celular', 'internet', 'vivo', 'tim', 'claro'], category: 'utilidades', type: 'expense', confidence: 0.8 },
    ];
    
    let selectedCategory = null;
    let confidence = 0.4;
    let reasoning = 'Categorização automática de fallback';
    
    // Try to find a matching pattern for the detected type
    for (const pattern of companyPatterns) {
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
              reasoning = `Empresa/serviço brasileiro detectado: "${keyword}" → ${pattern.category}`;
              break;
            }
          }
        }
        if (confidence > 0.4) break; // Found a good match
      }
    }
    
    // Fallback to default category of correct type
    if (!selectedCategory && correctTypeCategories.length > 0) {
      selectedCategory = correctTypeCategories.find(cat => 
        cat.name.toLowerCase().includes('outros') || 
        cat.name.toLowerCase().includes('diversos')
      ) || correctTypeCategories[0];
      
      confidence = 0.3;
      reasoning = `Categoria padrão para ${transactionType === 'income' ? 'receita' : 'gasto'}`;
    }
    
    // Ultimate fallback
    if (!selectedCategory) {
      selectedCategory = categories[0];
      confidence = 0.2;
      reasoning = 'Categoria de emergência - requer revisão manual';
    }
    
    console.log(`🎯 [FALLBACK] Transaction ${index}: "${description}" → ${selectedCategory.name} (${confidence})`);
    
    return {
      transaction_index: index,
      category_id: selectedCategory.id,
      subcategory_id: null,
      confidence: confidence,
      reasoning: reasoning
    };
  });
}

// Intelligent validation that allows AI to correct type detection
function validateWithTypeCorrection(
  suggestion: AIResponse,
  transaction: Transaction,
  categories: Category[],
  subcategories: Subcategory[],
  expectedType: string
): AIResponse {
  const suggestedCategory = categories.find(cat => cat.id === suggestion.category_id);
  
  if (!suggestedCategory) {
    console.warn(`⚠️ [VALIDATION] Category ${suggestion.category_id} not found for transaction ${suggestion.transaction_index}`);
    
    // Find fallback category of expected type
    const fallbackCategory = categories.find(cat => 
      cat.type === expectedType && (
        cat.name.toLowerCase().includes('outros') || 
        cat.name.toLowerCase().includes('diversos')
      )
    ) || categories.find(cat => cat.type === expectedType);
    
    return {
      ...suggestion,
      category_id: fallbackCategory?.id || categories[0]?.id || '',
      confidence: Math.max(0.3, suggestion.confidence * 0.5),
      reasoning: 'Categoria original não encontrada, usando fallback'
    };
  }
  
  // Check if AI suggested a different type (potential correction)
  if (suggestedCategory.type !== expectedType) {
    const desc = transaction.description.toLowerCase();
    
    // Allow AI to correct type for known cases
    const knownCorrections = [
      'uber', '99', 'taxi', 'ifood', 'rappi', 'd market', 'emporio km',
      'americanas', 'magazine luiza', 'mercado livre', 'netflix', 'spotify'
    ];
    
    const needsCorrection = knownCorrections.some(keyword => desc.includes(keyword));
    
    if (needsCorrection && suggestion.confidence > 0.6) {
      console.log(`🔄 [VALIDATION] AI corrected type from ${expectedType} to ${suggestedCategory.type} for "${transaction.description}"`);
      
      return {
        ...suggestion,
        confidence: Math.min(0.8, suggestion.confidence), // Cap confidence for corrections
        reasoning: `${suggestion.reasoning} (tipo corrigido pela IA: ${expectedType} → ${suggestedCategory.type})`,
        suggested_type: suggestedCategory.type
      };
    }
    
    // Type mismatch - find correct type category
    console.warn(`⚠️ [VALIDATION] Type mismatch for transaction ${suggestion.transaction_index}: expected ${expectedType}, got ${suggestedCategory.type}`);
    
    const correctTypeCategory = categories.find(cat => 
      cat.type === expectedType && (
        cat.name.toLowerCase().includes('outros') || 
        cat.name.toLowerCase().includes('diversos')
      )
    ) || categories.find(cat => cat.type === expectedType);
    
    if (correctTypeCategory) {
      return {
        ...suggestion,
        category_id: correctTypeCategory.id,
        confidence: Math.max(0.3, suggestion.confidence * 0.6),
        reasoning: `Tipo ajustado para ${expectedType} (original: ${suggestion.reasoning})`
      };
    }
  }

  // Validate subcategory
  if (suggestion.subcategory_id) {
    const subcategoryExists = subcategories.find(sub => 
      sub.id === suggestion.subcategory_id && sub.category_id === suggestion.category_id
    );
    if (!subcategoryExists) {
      console.warn(`⚠️ [VALIDATION] Invalid subcategory ${suggestion.subcategory_id} for transaction ${suggestion.transaction_index}`);
      suggestion.subcategory_id = null;
    }
  }

  // Ensure confidence is within valid range
  suggestion.confidence = Math.max(0.2, Math.min(1.0, suggestion.confidence || 0.5));

  return suggestion;
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
      // Build enhanced prompt with intelligent type correction
      const incomeCategories = categories.filter((cat: Category) => cat.type === 'income');
      const expenseCategories = categories.filter((cat: Category) => cat.type === 'expense');

      // Optimized prompt - shorter and clearer
      const prompt = `Categorize these ${transactions.length} Brazilian transactions. Return ONLY valid JSON array.

INCOME CATEGORIES:
${incomeCategories.map((cat: Category) => `${cat.id}:${cat.name}`).join('\n')}

EXPENSE CATEGORIES:
${expenseCategories.map((cat: Category) => `${cat.id}:${cat.name}`).join('\n')}

KEY RULES:
- iFood/Uber/99/D Market = expense
- PIX "enviada" = expense, "recebida" = income
- If type seems wrong, correct it

TRANSACTIONS:
${transactionsWithType.map((t: any, index: number) => 
  `${index}. "${t.description}" R$${t.amount} TYPE:${t.detectedType}`
).join('\n')}

Return ONLY this JSON format:
[{"transaction_index":0,"category_id":"uuid","subcategory_id":null,"confidence":0.8,"reasoning":"explanation"}]`;

      // Log the prompt for analysis
      console.log('🔍 [GEMINI_PROMPT] Sending prompt to Gemini:');
      console.log('📝 [PROMPT_CONTENT]:', prompt);
      console.log('📊 [PROMPT_STATS] Length:', prompt.length, 'chars, Transactions:', transactions.length);

      console.log('🤖 [AI] Sending enhanced request to Gemini...');
      
      const geminiResponse = await callGeminiWithRetry(prompt, geminiApiKey);

      if (geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
        const responseText = geminiResponse.candidates[0].content.parts[0].text;
        console.log('🔍 [GEMINI_RESPONSE] Full response received:');
        console.log('📄 [RESPONSE_TEXT]:', responseText);
        console.log('📊 [RESPONSE_STATS] Length:', responseText.length, 'chars');
        
        try {
          // Try multiple parsing strategies
          let jsonText = responseText.trim();
          
          // Remove markdown formatting if present
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
          }
          
          // Try to extract JSON array
          const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
            console.log('🎯 [PARSING] Extracted JSON array:', jsonText.substring(0, 200) + '...');
          }
          
          // Parse the JSON
          aiSuggestions = JSON.parse(jsonText);
          console.log(`✅ [AI] Successfully parsed ${aiSuggestions.length} suggestions`);
          
          // Validate the structure
          if (!Array.isArray(aiSuggestions)) {
            throw new Error('Response is not an array');
          }
          
          if (aiSuggestions.length !== transactions.length) {
            console.warn(`⚠️ [AI] Expected ${transactions.length} suggestions, got ${aiSuggestions.length}`);
          }
          
        } catch (parseError) {
          console.error('❌ [AI] Parse error:', parseError);
          console.error('🔍 [DEBUG] Raw response that failed to parse:', responseText);
          throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }
      } else {
        console.error('❌ [GEMINI] Invalid response structure:', geminiResponse);
        throw new Error('Invalid response format from Gemini API');
      }

    } catch (geminiError) {
      console.error('⚠️ [AI] Gemini API failed:', geminiError);
      console.log('🔄 [FALLBACK] Using enhanced fallback system...');
      
      aiSuggestions = createEnhancedFallbackSuggestions(transactions, categories);
      usedFallback = true;
    }

    // Enhanced validation with intelligent type correction
    const validatedSuggestions = aiSuggestions.map((suggestion, index) => {
      const transaction = transactionsWithType[index];
      const expectedType = transaction.detectedType;
      
      return validateWithTypeCorrection(
        suggestion,
        transaction,
        categories,
        subcategories,
        expectedType
      );
    });

    console.log(`✅ [SUCCESS] Processing complete: ${validatedSuggestions.length} suggestions`);
    console.log(`📊 [STATS] Average confidence: ${(validatedSuggestions.reduce((sum, s) => sum + s.confidence, 0) / validatedSuggestions.length).toFixed(2)}`);
    
    const typeCorrections = validatedSuggestions.filter(s => s.suggested_type).length;
    if (typeCorrections > 0) {
      console.log(`🔄 [STATS] Type corrections made: ${typeCorrections}`);
    }
    
    if (usedFallback) {
      console.log('⚠️ [FALLBACK] Enhanced fallback system was used');
    }

    return new Response(
      JSON.stringify({ 
        suggestions: validatedSuggestions,
        usedFallback: usedFallback,
        typeCorrections: typeCorrections,
        message: usedFallback ? 
          'Sistema de fallback inteligente aplicado' : 
          `Categorização por IA concluída${typeCorrections > 0 ? ` (${typeCorrections} correções de tipo)` : ''}`
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
