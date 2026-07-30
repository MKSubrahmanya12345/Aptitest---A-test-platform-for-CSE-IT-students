/**
 * AWS Bedrock Question Processor - JavaScript Version
 * No TypeScript compilation needed
 * 
 * Usage:
 *   export AWS_ACCESS_KEY_ID=xxx
 *   export AWS_SECRET_ACCESS_KEY=xxx
 *   export AWS_REGION=us-east-1
 *   node src/scripts/bedrock-processor-js.mjs [--dry-run] [--limit=100]
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
const AUTO_APPROVE_THRESHOLD = 95;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aptitest',
  port: parseInt(process.env.DB_PORT || '3306'),
};

// Initialize Bedrock
const bedrockClient = new BedrockRuntimeClient({ 
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

// Database pool
let pool;

async function initDB() {
  pool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true });
  console.log('✅ Database connected');
}

/**
 * Call AWS Bedrock
 */
async function analyzeWithBedrock(questionText, currentAnswer, detectedType) {
  const systemPrompt = `You are an expert aptitude test question analyzer.

Analyze this question and return JSON with:
- questionType: mcq_single, boolean, fraction, ratio, numeric, or fill_in_blank
- confidence: 0-100
- correctedAnswer: properly formatted JSON
- correctedQuestionText: fixed question if needed
- suggestedOptions: array of 4 options ONLY for mcq_single
- reasoning: brief explanation
- flags: array of warnings (can be empty)

CRITICAL RULES:
- "20 and 30" with ratio context → {values: [20, 30]}
- "4 days", "5 hours" → numeric {value: 4} (unit stays in question)
- "3/4" → fraction {numerator: 3, denominator: 4}
- "3:4" or "3 to 4" → ratio {values: [3, 4]}
- "True"/"False" → boolean {value: true/false}
- Text answers without options → suggest converting to mcq with 4 options
- If question has "which", "select", "choose" → mcq_single

Return ONLY valid JSON, no markdown code blocks.`;

  const userPrompt = `QUESTION: "${questionText}"
CURRENT ANSWER: ${JSON.stringify(currentAnswer)}
DETECTED TYPE: ${detectedType || 'unknown'}

Respond with JSON only.`;

  try {
    let response;
    
    if (BEDROCK_MODEL_ID.includes('claude')) {
      const body = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1500,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      };

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify(body),
        contentType: "application/json",
        accept: "application/json",
      });

      response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const content = responseBody.content?.[0]?.text || responseBody.completion;
      return parseAIResponse(content);

    } else if (BEDROCK_MODEL_ID.includes('titan')) {
      const body = {
        inputText: `${systemPrompt}\n\n${userPrompt}`,
        textGenerationConfig: { maxTokenCount: 1500, temperature: 0.1, topP: 0.9 }
      };

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify(body),
        contentType: "application/json",
      });

      response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return parseAIResponse(responseBody.results?.[0]?.outputText);

    } else if (BEDROCK_MODEL_ID.includes('qwen')) {
      // Qwen models use messages format like Claude
      const body = {
        max_tokens: 1500,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      };

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify(body),
        contentType: "application/json",
      });

      response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return parseAIResponse(responseBody.choices?.[0]?.message?.content || responseBody.output?.choices?.[0]?.message?.content);

    } else {
      // Generic fallback (Mistral, Llama, etc.)
      const body = {
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        max_tokens: 1500,
        temperature: 0.1,
      };

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify(body),
        contentType: "application/json",
      });

      response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return parseAIResponse(responseBody.completion || responseBody.output || responseBody.generated_text);
    }

  } catch (error) {
    console.error('Bedrock error:', error.message);
    return heuristicAnalysis(questionText, currentAnswer);
  }
}

function parseAIResponse(content) {
  try {
    // Remove markdown code blocks
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const jsonMatch = cleanContent.match(/({[\s\S]*})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : cleanContent;
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      questionType: parsed.questionType || 'uncertain',
      confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
      correctedAnswer: parsed.correctedAnswer || parsed.correct_answer || {},
      correctedQuestionText: parsed.correctedQuestionText || parsed.corrected_question_text || '',
      suggestedOptions: parsed.suggestedOptions || parsed.suggested_options,
      reasoning: parsed.reasoning || '',
      flags: parsed.flags || [],
    };
  } catch (error) {
    console.error('Parse error:', error.message);
    return {
      questionType: 'uncertain',
      confidence: 40,
      correctedAnswer: {},
      correctedQuestionText: '',
      reasoning: 'Parse failed',
      flags: ['AI response parsing failed'],
    };
  }
}

function heuristicAnalysis(questionText, currentAnswer) {
  const text = questionText.toLowerCase();
  const answerStr = JSON.stringify(currentAnswer).toLowerCase();
  
  // Keep existing fraction format
  if (currentAnswer?.numerator !== undefined && currentAnswer?.denominator !== undefined) {
    return {
      questionType: 'fraction',
      confidence: 90,
      correctedAnswer: { 
        numerator: parseInt(currentAnswer.numerator) || 0, 
        denominator: parseInt(currentAnswer.denominator) || 1 
      },
      correctedQuestionText: questionText,
      reasoning: 'Answer already has numerator/denominator structure - keeping as fraction',
      flags: [],
    };
  }
  
  // Keep existing ratio format  
  if (currentAnswer?.values && Array.isArray(currentAnswer.values) && currentAnswer.values.length >= 2) {
    return {
      questionType: 'ratio',
      confidence: 90,
      correctedAnswer: { values: currentAnswer.values.map(v => parseFloat(v) || 0) },
      correctedQuestionText: questionText,
      reasoning: 'Answer already has values array - keeping as ratio',
      flags: [],
    };
  }
  
  // Keep existing boolean format
  if (typeof currentAnswer?.value === 'boolean') {
    return {
      questionType: 'boolean',
      confidence: 90,
      correctedAnswer: { value: currentAnswer.value },
      correctedQuestionText: questionText,
      suggestedOptions: [
        { key: 'true', text: 'True' },
        { key: 'false', text: 'False' }
      ],
      reasoning: 'Answer already has boolean value structure',
      flags: [],
    };
  }
  
  // Keep existing numeric format
  if (typeof currentAnswer?.value === 'number' && !currentAnswer?.unit) {
    return {
      questionType: 'numeric',
      confidence: 85,
      correctedAnswer: { value: currentAnswer.value },
      correctedQuestionText: questionText,
      reasoning: 'Answer already has numeric value structure',
      flags: [],
    };
  }
  
  // Convert numeric_with_unit to numeric (strip units)
  if (currentAnswer?.value !== undefined && currentAnswer?.unit) {
    return {
      questionType: 'numeric',
      confidence: 85,
      correctedAnswer: { value: parseFloat(currentAnswer.value) || 0 },
      correctedQuestionText: questionText,
      reasoning: `Converted from numeric_with_unit to numeric - unit "${currentAnswer.unit}" stays in question text`,
      flags: [`Original answer had unit: ${currentAnswer.unit}`],
    };
  }
  
  // Detect fraction in text like "1/3"
  if (/\d+\/\d+/.test(answerStr) && !currentAnswer?.numerator) {
    const match = answerStr.match(/(\d+)\/(\d+)/);
    if (match) {
      return {
        questionType: 'fraction',
        confidence: 85,
        correctedAnswer: { numerator: parseInt(match[1]), denominator: parseInt(match[2]) },
        correctedQuestionText: questionText,
        reasoning: 'Detected fraction format X/Y in answer text',
        flags: [],
      };
    }
  }
  
  // Detect ratio in text like "3:4" or "3 to 4"
  const ratioPattern = /(\d+(?:\.\d+)?)\s*(?::|to)\s*(\d+(?:\.\d+)?)/;
  if (ratioPattern.test(answerStr) && !currentAnswer?.values) {
    const match = answerStr.match(ratioPattern);
    if (match) {
      return {
        questionType: 'ratio',
        confidence: 85,
        correctedAnswer: { values: [parseFloat(match[1]), parseFloat(match[2])] },
        correctedQuestionText: questionText,
        reasoning: 'Detected ratio format in answer text',
        flags: ['Verify ratio values are in correct order'],
      };
    }
  }
  
  // Boolean detection
  if (text.includes('true or false') || text.includes('yes or no')) {
    const isTrue = /true|yes|1/.test(answerStr);
    return {
      questionType: 'boolean',
      confidence: 90,
      correctedAnswer: { value: isTrue },
      correctedQuestionText: questionText,
      suggestedOptions: [
        { key: 'true', text: 'True' },
        { key: 'false', text: 'False' }
      ],
      reasoning: 'Boolean question format detected',
      flags: [],
    };
  }
  
  // MCQ detection - if question mentions "which", "select", "choose"
  if (/\b(which|select|choose|pick)\b/.test(text) && text.includes('option')) {
    const options = ['A', 'B', 'C', 'D'];
    const foundOption = options.find(opt => answerStr.includes(opt.toLowerCase()));
    return {
      questionType: 'mcq_single',
      confidence: 80,
      correctedAnswer: { value: foundOption || 'A' },
      correctedQuestionText: questionText,
      suggestedOptions: [
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
        { key: 'C', text: 'Option C' },
        { key: 'D', text: 'Option D' }
      ],
      reasoning: 'MCQ format question with options mentioned',
      flags: foundOption ? [] : ['Could not determine which option is correct'],
    };
  }
  
  // Plain text answers → suggest fill_in_blank or mcq
  if (typeof currentAnswer === 'string' || (currentAnswer && Object.keys(currentAnswer).length === 0)) {
    if (text.length > 100 && text.includes('?')) {
      return {
        questionType: 'mcq_single',
        confidence: 60,
        correctedAnswer: { value: 'A' },
        correctedQuestionText: questionText,
        suggestedOptions: [
          { key: 'A', text: 'Option A' },
          { key: 'B', text: 'Option B' },
          { key: 'C', text: 'Option C' },
          { key: 'D', text: 'Option D' }
        ],
        reasoning: 'Long text question - suggest converting to MCQ with 4 options',
        flags: ['Needs manual review - generate proper MCQ options'],
      };
    }
    return {
      questionType: 'fill_in_blank',
      confidence: 60,
      correctedAnswer: { answers: [String(currentAnswer)] },
      correctedQuestionText: questionText,
      reasoning: 'Plain text answer - converted to fill_in_blank format',
      flags: ['Consider converting to MCQ for better user experience'],
    };
  }
  
  // Fallback: preserve original answer structure
  return {
    questionType: 'uncertain',
    confidence: 40,
    correctedAnswer: currentAnswer,
    correctedQuestionText: questionText,
    reasoning: 'Could not determine optimal type - preserving original answer',
    flags: ['Manual review recommended'],
  };
}

function validateAnswerFormat(type, answer) {
  const errors = [];
  
  switch (type) {
    case 'mcq_single':
      if (!answer?.value || !['A','B','C','D'].includes(answer.value)) {
        errors.push('MCQ answer must be A, B, C, or D');
        return { valid: false, fixed: { value: 'A' }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'boolean':
      if (typeof answer?.value !== 'boolean') {
        const val = String(answer?.value).toLowerCase();
        return { valid: false, fixed: { value: /true|yes|1/.test(val) }, errors: ['Fixed boolean'] };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'ratio':
      if (!answer?.values || !Array.isArray(answer.values) || answer.values.length < 2) {
        return { valid: false, fixed: { values: [1, 1] }, errors: ['Invalid ratio format'] };
      }
      return { valid: true, fixed: { values: answer.values.map(v => parseFloat(v) || 0) }, errors };
      
    case 'fraction':
      if (typeof answer?.numerator !== 'number' || typeof answer?.denominator !== 'number') {
        return { valid: false, fixed: { numerator: 0, denominator: 1 }, errors: ['Invalid fraction'] };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'numeric':
      if (typeof answer?.value !== 'number') {
        const num = parseFloat(answer);
        return { valid: false, fixed: { value: isNaN(num) ? 0 : num }, errors: ['Converted to numeric'] };
      }
      return { valid: true, fixed: { value: answer.value }, errors };
      
    case 'fill_in_blank':
      if (!answer?.answers || !Array.isArray(answer.answers)) {
        return { valid: false, fixed: { answers: [''] }, errors: ['Fixed fill-in-blank'] };
      }
      return { valid: true, fixed: answer, errors };
      
    default:
      errors.push(`Unknown type: ${type}`);
      return { valid: false, fixed: answer, errors };
  }
}

async function getPendingQuestions(limit) {
  const [rows] = await pool.query(
    `SELECT * FROM review_pending_questions 
     WHERE status = 'pending' 
     ORDER BY id ASC 
     LIMIT ${parseInt(limit)}`
  );
  return rows;
}

async function approveQuestion(original, analysis) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const correctedAnswerStr = JSON.stringify(analysis.correctedAnswer);
    const gradingConfigStr = JSON.stringify({ type: analysis.questionType, marks: 1, negativeMarks: 0 });
    const optionsStr = analysis.suggestedOptions ? JSON.stringify(analysis.suggestedOptions) : (original.options || null);
    
    // Update pending
    await conn.query(
      `UPDATE review_pending_questions 
       SET final_question_type = '${analysis.questionType}', 
           question_text = ${conn.escape(analysis.correctedQuestionText || original.question_text)}, 
           correct_answer = ${conn.escape(correctedAnswerStr)}, 
           grading_config = ${conn.escape(gradingConfigStr)}, 
           options = ${conn.escape(optionsStr)}, 
           status = 'approved'
       WHERE id = ${original.id}`
    );
    
    // Insert to questions
    await conn.query(
      `INSERT INTO questions 
       (category, subcategory, difficulty, question_type, question_text, 
        passage, data_block, options, correct_answer, grading_config, 
        solution, source_file, source_question_no, status)
       VALUES (
         ${conn.escape(original.category)},
         ${conn.escape(original.subcategory)},
         ${conn.escape(original.difficulty || 'basic')},
         ${conn.escape(analysis.questionType)},
         ${conn.escape(analysis.correctedQuestionText || original.question_text)},
         ${conn.escape(original.passage)},
         ${conn.escape(original.data_block)},
         ${conn.escape(optionsStr)},
         ${conn.escape(correctedAnswerStr)},
         ${conn.escape(gradingConfigStr)},
         ${conn.escape(original.solution)},
         ${conn.escape(original.source_file)},
         ${conn.escape(original.source_question_no)},
         'active'
       )`
    );
    
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function flagQuestion(id, original, analysis) {
  const correctedAnswerStr = JSON.stringify(analysis.correctedAnswer);
  const gradingConfigStr = JSON.stringify({ type: analysis.questionType, marks: 1, negativeMarks: 0 });
  const optionsStr = analysis.suggestedOptions ? JSON.stringify(analysis.suggestedOptions) : (original.options || null);
  
  await pool.query(
    `UPDATE review_pending_questions 
     SET final_question_type = '${analysis.questionType}', 
         question_text = ${pool.escape(analysis.correctedQuestionText || original.question_text)}, 
         correct_answer = ${pool.escape(correctedAnswerStr)}, 
         grading_config = ${pool.escape(gradingConfigStr)}, 
         options = ${pool.escape(optionsStr)}
     WHERE id = ${id}`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
  
  console.log('🤖 AWS Bedrock Question Processor (JS)');
  console.log('=======================================');
  console.log(`Model: ${BEDROCK_MODEL_ID}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Auto-approve threshold: ${AUTO_APPROVE_THRESHOLD}%\n`);
  
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.error('❌ Set AWS credentials:');
    console.error('  export AWS_ACCESS_KEY_ID=xxx');
    console.error('  export AWS_SECRET_ACCESS_KEY=xxx');
    process.exit(1);
  }
  
  await initDB();
  
  const questions = await getPendingQuestions(limit);
  console.log(`Found ${questions.length} pending questions\n`);
  
  let approved = 0, flagged = 0, errors = 0;
  const typeStats = {};
  const report = [];
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`[${i + 1}/${questions.length}] ID ${q.id}`);
    
    try {
      const analysis = await analyzeWithBedrock(
        q.question_text,
        q.correct_answer,
        q.detected_question_type
      );
      
      typeStats[analysis.questionType] = (typeStats[analysis.questionType] || 0) + 1;
      
      const validation = validateAnswerFormat(analysis.questionType, analysis.correctedAnswer);
      if (!validation.valid) {
        analysis.correctedAnswer = validation.fixed;
        analysis.flags.push(...validation.errors);
        analysis.confidence = Math.max(analysis.confidence - 10, 50);
      }
      
      const shouldApprove = analysis.confidence >= AUTO_APPROVE_THRESHOLD && 
                            analysis.questionType !== 'uncertain';
      
      const status = shouldApprove ? '✅ APPROVED' : '⚠️ FLAGGED';
      console.log(`  ${status} | ${analysis.questionType} | ${analysis.confidence}%`);
      console.log(`  ${analysis.reasoning.substring(0, 80)}...`);
      
      report.push({
        id: q.id,
        originalText: q.question_text.substring(0, 100),
        originalAnswer: q.correct_answer,
        newType: analysis.questionType,
        newAnswer: analysis.correctedAnswer,
        confidence: analysis.confidence,
        action: shouldApprove ? 'approved' : 'flagged',
        flags: analysis.flags
      });
      
      if (!dryRun) {
        if (shouldApprove) {
          await approveQuestion(q, analysis);
          approved++;
        } else {
          await flagQuestion(q.id, q, analysis);
          flagged++;
        }
      }
      
      await new Promise(r => setTimeout(r, 500)); // Rate limit
      
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      errors++;
    }
    
    console.log('');
  }
  
  console.log('\n📊 SUMMARY');
  console.log('===========');
  console.log(`Total: ${questions.length}`);
  if (!dryRun) {
    console.log(`Auto-approved: ${approved}`);
    console.log(`Flagged: ${flagged}`);
  }
  console.log(`Errors: ${errors}`);
  console.log('\nTypes detected:', typeStats);
  
  // Save report
  const reportPath = join(process.cwd(), `bedrock-report-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report: ${reportPath}`);
  
  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
