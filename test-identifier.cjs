// Test script for the new standardizeIdentifier implementation
const fs = require('fs');

// Copy of the normalizeString function
function normalizeString(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\-]/g, ' ') // Remove special characters but keep spaces and hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Copy of the extractCounterpartyIdentifier function with modifications for testing
function extractCounterpartyIdentifier(description) {
  if (!description) return { identifier: null, name: null, bankDetails: null };

  // Remove special characters and normalize
  const cleanDescription = description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s\-\.\@\(\)\d]/g, ' ') // Keep alphanumeric, spaces, hyphens, dots, @, (), digits
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  console.log('🔍 [EXTRACT] Cleaned description:', cleanDescription);

  // 1. Try to extract CPF/CNPJ (highest priority)
  // CPF pattern: XXX.XXX.XXX-XX or XXXXXXXXXXX
  // CNPJ pattern: XX.XXX.XXX/XXXX-XX or XXXXXXXXXXXXXX
  const cpfCnpjRegex = /(?:\b|\D)(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})(?:\b|\D)/gi;
  let cpfCnpjMatch;
  while ((cpfCnpjMatch = cpfCnpjRegex.exec(cleanDescription)) !== null) {
    const cpfCnpj = cpfCnpjMatch[1].replace(/\D/g, ''); // Remove all non-digits
    if (cpfCnpj.length === 11 || cpfCnpj.length === 14) { // Valid CPF (11) or CNPJ (14)
      // Extract name (text before CPF/CNPJ)
      const nameMatch = cleanDescription.substring(0, cpfCnpjMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      console.log('✅ [EXTRACT] Found CPF/CNPJ:', { cpfCnpj, name });
      return { 
        identifier: cpfCnpj, 
        name: name ? normalizeString(name) : null,
        bankDetails: null
      };
    }
  }

  // 2. Try to extract UUID PIX Key (random key)
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  let uuidMatch;
  while ((uuidMatch = uuidRegex.exec(cleanDescription)) !== null) {
    // Extract name (text before UUID)
    const nameMatch = cleanDescription.substring(0, uuidMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
    const name = nameMatch ? nameMatch[1].trim() : null;
    console.log('✅ [EXTRACT] Found UUID PIX:', { uuid: uuidMatch[0].toLowerCase(), name });
    return { 
      identifier: uuidMatch[0].toLowerCase(), 
      name: name ? normalizeString(name) : null,
      bankDetails: null
    };
  }

  // 3. Try to extract Phone or Email PIX Key
  // Phone pattern (Brazilian): (XX) XXXXX-XXXX or similar
  const phoneRegex = /[\d\-\(\)\s]{10,}/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(cleanDescription)) !== null) {
    const phoneClean = phoneMatch[0].replace(/\D/g, '');
    if (phoneClean.length >= 10 && phoneClean.length <= 11) { // Valid Brazilian phone
      // Extract name (text before phone)
      const nameMatch = cleanDescription.substring(0, phoneMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      console.log('✅ [EXTRACT] Found Phone PIX:', { phone: phoneClean, name });
      return { 
        identifier: phoneClean, 
        name: name ? normalizeString(name) : null,
        bankDetails: null
      };
    }
  }

  // Email pattern
  const emailRegex = /[\w\.\-]+@[\w\.\-]+\.\w+/gi;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(cleanDescription)) !== null) {
    // Extract name (text before email)
    const nameMatch = cleanDescription.substring(0, emailMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
    const name = nameMatch ? nameMatch[1].trim() : null;
    console.log('✅ [EXTRACT] Found Email PIX:', { email: emailMatch[0].toLowerCase(), name });
    return { 
      identifier: emailMatch[0].toLowerCase(), 
      name: name ? normalizeString(name) : null,
      bankDetails: null
    };
  }

  // 4. Try to extract Bank Details (Bank, Agency, Account)
  const bankDetailsRegex = /(\w+)\s*\([^)]+\)\s*Ag[^:]*:\s*([\d\-]+)\s*Conta:\s*([\d\-]+)/i;
  const bankDetailsMatch = bankDetailsRegex.exec(cleanDescription);
  if (bankDetailsMatch) {
    const bank = bankDetailsMatch[1];
    const agency = bankDetailsMatch[2].replace(/\D/g, '');
    const account = bankDetailsMatch[3].replace(/\D/g, '');
    const bankDetails = `${normalizeString(bank)}-${agency}-${account}`;
    
    // Extract name (text before bank details)
    const nameMatch = cleanDescription.substring(0, bankDetailsMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
    const name = nameMatch ? nameMatch[1].trim() : null;
    console.log('✅ [EXTRACT] Found Bank Details:', { bankDetails, name });
    return { 
      identifier: bankDetails, 
      name: name ? normalizeString(name) : null,
      bankDetails: bankDetails
    };
  }

  // 5. Extract Counterparty Name (fallback)
  // Look for names at the beginning or after transaction type keywords
  const nameRegex = /(?:^|pix|transfer|pagamento|compra|saque|deposito)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i;
  const nameMatch = nameRegex.exec(cleanDescription);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    console.log('✅ [EXTRACT] Found Counterparty Name:', name);
    return { 
      identifier: null, 
      name: normalizeString(name),
      bankDetails: null
    };
  }

  console.log('⚠️ [EXTRACT] No counterparty identifier found');
  return { identifier: null, name: null, bankDetails: null };
}

// Copy of the standardizeIdentifier function
function standardizeIdentifier(description) {
  if (!description) return '';

  // Extract transaction type/purpose (more comprehensive)
  let transactionType = normalizeString(description);
  
  // Remove common prefixes/suffixes
  transactionType = transactionType
    .replace(/^(pix|ted|doc|transferencia|transfer|pagamento|compra|saque|deposito|recebido|enviado)\s*/i, '')
    .replace(/\s*(pix|ted|doc|transferencia|transfer|pagamento|compra|saque|deposito|recebido|enviado)$/i, '')
    .trim();
  
  // Remove dates, times, and long numbers
  transactionType = transactionType
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Dates
    .replace(/\d{2}:\d{2}:\d{2}/g, '') // Times
    .replace(/\b\d{10,}\b/g, '') // Long numbers (IDs, account numbers)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Remove CPF/CNPJ patterns
  transactionType = transactionType
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '') // CPF
    .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '') // CNPJ
    .replace(/\s+/g, ' ') // Normalize whitespace again
    .trim();

  // Extract counterparty information
  const counterpartyInfo = extractCounterpartyIdentifier(description);
  
  // Build standardized identifier with consistent order:
  // [TRANSACTION_TYPE] - [COUNTERPARTY_NAME] - [COUNTERPARTY_IDENTIFIER] - [BANK_DETAILS]
  const components = [];
  
  // Add transaction type (always first if not empty)
  if (transactionType) {
    components.push(transactionType);
  }
  
  // Add counterparty name (if available)
  if (counterpartyInfo.name) {
    components.push(counterpartyInfo.name);
  }
  
  // Add counterparty identifier (highest priority first)
  if (counterpartyInfo.identifier) {
    components.push(counterpartyInfo.identifier);
  }
  
  // Add bank details (if available and no other identifier found)
  if (counterpartyInfo.bankDetails && !counterpartyInfo.identifier) {
    components.push(counterpartyInfo.bankDetails);
  }
  
  // Filter out empty components and join
  const result = components.filter(c => c && c.length > 0).join(' - ');
  console.log('🔍 [MAPPING] Standardized identifier for:', { 
    original: description, 
    standardized: result,
    components: {
      transactionType,
      name: counterpartyInfo.name,
      identifier: counterpartyInfo.identifier,
      bankDetails: counterpartyInfo.bankDetails
    }
  });
  return result;
}

// Test case from user example
const testDescription = "TransferÃªncia enviada pelo Pix - Lucas Anderson Silva - â€¢â€¢â€¢.060.689-â€¢â€¢ - ITAÃš UNIBANCO S.A. (0341) AgÃªncia: 6305 Conta: 41155-2";

console.log('=== Testing standardizeIdentifier ===');
console.log('Input:', testDescription);

const result = standardizeIdentifier(testDescription);
console.log('Output:', result);

// Additional test cases
console.log('\n=== Additional Test Cases ===');

// Test case with CPF
const cpfTest = "PIX recebido de ANA PAULA SILVA - 123.456.789-00 - Banco Inter";
console.log('\nCPF Test:');
console.log('Input:', cpfTest);
console.log('Output:', standardizeIdentifier(cpfTest));

// Test case with UUID PIX
const uuidTest = "Transferência enviada via PIX - João Silva - 123e4567-e89b-12d3-a456-426614174000";
console.log('\nUUID Test:');
console.log('Input:', uuidTest);
console.log('Output:', standardizeIdentifier(uuidTest));

// Test case with phone PIX
const phoneTest = "Pagamento via PIX - Maria Santos - (11) 98765-4321";
console.log('\nPhone Test:');
console.log('Input:', phoneTest);
console.log('Output:', standardizeIdentifier(phoneTest));
