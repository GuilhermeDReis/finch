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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, categories, subcategories } = await req.json();
    
    console.log('Received request:', { 
      transactionCount: transactions?.length,
      categoryCount: categories?.length,
      subcategoryCount: subcategories?.length 
    });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Encontrar categoria "Outros/Diversos"
    const defaultCategory = categories.find((cat: Category) => 
      cat.name.toLowerCase().includes('outros') || cat.name.toLowerCase().includes('diversos')
    );
    
    const defaultCategoryId = defaultCategory?.id || categories[0]?.id;
    console.log('Default category for fallback:', defaultCategory?.name, defaultCategoryId);

    // Construir prompt otimizado
    const prompt = `Você é um especialista em categorização de transações financeiras brasileiras.

DADOS DISPONÍVEIS:

CATEGORIAS:
${categories.map((cat: Category) => `${cat.id}: ${cat.name} (${cat.type})`).join('\n')}

SUBCATEGORIAS (agrupadas por categoria):
${categories.map((cat: Category) => {
  const catSubcategories = subcategories.filter((sub: Subcategory) => sub.category_id === cat.id);
  return `${cat.name}:\n${catSubcategories.map((sub: Subcategory) => `  ${sub.id}: ${sub.name}`).join('\n')}`;
}).join('\n\n')}

TRANSAÇÕES PARA CATEGORIZAR:
${transactions.map((t: Transaction, index: number) => 
  `${index}: ${t.description} | R$ ${t.amount.toFixed(2)} | ${t.payment_method} | ${t.date}`
).join('\n')}

INSTRUÇÕES:
1. Analise cada transação baseado na descrição, valor e método de pagamento
2. Considere padrões brasileiros (nomes de estabelecimentos, bancos, tipos de negócio)
3. Para cada transação, sugira a categoria e subcategoria mais apropriada
4. Se não conseguir identificar com confiança (< 50%), use categoria "${defaultCategory?.name}" (ID: ${defaultCategoryId})
5. Calcule um nível de confiança de 0.0 a 1.0
6. Forneça uma breve explicação da decisão

FORMATO DE RESPOSTA (JSON VÁLIDO):
[
  {
    "transaction_index": 0,
    "category_id": "uuid-da-categoria",
    "subcategory_id": "uuid-da-subcategoria-ou-null",
    "confidence": 0.85,
    "reasoning": "Descrição indica compra em supermercado"
  }
]

Retorne APENAS o array JSON, sem texto adicional.`;

    console.log('Sending request to Gemini API...');
    
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
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const geminiResponse = await response.json();
    console.log('Gemini API response:', geminiResponse);

    let aiSuggestions: AIResponse[] = [];
    
    if (geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
      const responseText = geminiResponse.candidates[0].content.parts[0].text;
      console.log('Raw response text:', responseText);
      
      try {
        // Extrair JSON da resposta (pode vir com markdown ou texto extra)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          aiSuggestions = JSON.parse(jsonMatch[0]);
          console.log('Parsed AI suggestions:', aiSuggestions.length);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Failed to parse AI response');
      }
    } else {
      throw new Error('Invalid response format from Gemini API');
    }

    // Validar e sanitizar respostas
    const validatedSuggestions = aiSuggestions.map((suggestion, index) => {
      // Verificar se categoria existe
      const categoryExists = categories.find((cat: Category) => cat.id === suggestion.category_id);
      if (!categoryExists) {
        console.warn(`Invalid category_id for transaction ${index}, using default`);
        suggestion.category_id = defaultCategoryId;
        suggestion.confidence = 0.3;
        suggestion.reasoning = 'Categoria sugerida pela IA não encontrada, usando padrão';
      }

      // Verificar se subcategoria existe e pertence à categoria
      if (suggestion.subcategory_id) {
        const subcategoryExists = subcategories.find((sub: Subcategory) => 
          sub.id === suggestion.subcategory_id && sub.category_id === suggestion.category_id
        );
        if (!subcategoryExists) {
          console.warn(`Invalid subcategory_id for transaction ${index}, removing`);
          suggestion.subcategory_id = null;
        }
      }

      // Garantir que confidence está no range correto
      suggestion.confidence = Math.max(0, Math.min(1, suggestion.confidence || 0.5));

      return suggestion;
    });

    console.log('Validated suggestions:', validatedSuggestions.length);

    return new Response(
      JSON.stringify({ suggestions: validatedSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gemini-categorize-transactions:', error);
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