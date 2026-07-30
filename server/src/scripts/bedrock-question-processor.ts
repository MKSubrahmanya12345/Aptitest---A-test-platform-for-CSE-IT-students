/**
 * AWS Bedrock AI Question Processor
 * 
 * Uses AWS Bedrock (Claude/Moonshot) to intelligently process questions
 * 
 * Usage: 
 *   export AWS_ACCESS_KEY_ID=xxx
 *   export AWS_SECRET_ACCESS_KEY=xxx
 *   export AWS_REGION=us-east-1
 *   npx ts-node bedrock-question-processor.ts [--dry-run] [--limit=100]
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import pool from '../config/db';
import { reviewModel } from '../models/review.model';

// Bedrock Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
// Alternative: 'amazon.titan-text-express-v1'
// Alternative: 'mistral.mistral-7b-instruct-v0:2'
// Alternative: 'moonshotai.kimi-k2.5' (if available in your region)

// AUTO-APPROVE threshold (0-100)
const AUTO_APPROVE_THRESHOLD = 95;
const BATCH_SIZE = 10;

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ 
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

interface AIAnalysisResult {
  questionType: 'mcq_single' | 'boolean' | 'fraction' | 'ratio' | 'numeric' | 'fill_in_blank' | 'uncertain';
  confidence: number;
  correctedAnswer: any;
  correctedQuestionText: string;
  suggestedOptions?: { key: string; text: string }[];
  reasoning: string;
  flags: string[];
}

/**
 * Call AWS Bedrock to analyze question
 */
async function analyzeWithBedrock(
  questionText: string,
  currentAnswer: any,
  detectedType?: string
): Promise<AIAnalysisResult> {
  
  const systemPrompt = `You are an expert aptitude test question analyzer. Your job is to:
1. Determine the optimal question type from these options: mcq_single, boolean, fraction, ratio, numeric, fill_in_blank
2. Fix the answer format to match the expected JSON structure
3. Set confidence level (0-100) based on how certain you are
4. Provide reasoning and any flags

IMPORTANT FORMATTING RULES:
- NUMERIC: plain numbers like {value: 20} - units go in question text, not answer
- RATIO: "3 to 4" or "3:4" becomes {values: [3, 4]}
- FRACTION: "3/4" becomes {numerator: 3, denominator: 4}
- BOOLEAN: true/false as {value: true}
- MCQ: {value: "A"} with 4 options
- For "4 days", "5 hours" → numeric {value: 4} or {value: 5}, mention units in question text

Examples of fixes needed:
- "20 and 30" detected as ratio → {values: [20, 30]}
- Plain text answer when question needs MCQ → suggest 4 relevant options
- "True" → {value: true}`;

  const userPrompt = `Analyze this question:

QUESTION TEXT: "${questionText}"

CURRENT ANSWER VALUE: ${JSON.stringify(currentAnswer, null, 2)}

CURRENTLY DETECTED TYPE: ${detectedType || 'unknown'}

Return ONLY a JSON object with this exact structure:
{
  "questionType": "<type>",
  "confidence": <0-100>,
  "correctedAnswer": <proper JSON>,
  "correctedQuestionText": "<improved text or original>",
  "suggestedOptions": [{"key": "A", "text": "..."}, ...],
  "reasoning": "<why you chose this>",
  "flags": ["<warning if any>"]
}`;

  try {
    let response;
    
    // Check which model is being used
    if (BEDROCK_MODEL_ID.includes('claude')) {
      // Anthropic Claude format
      const body = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt }
        ]
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
      // Amazon Titan format
      const body = {
        inputText: `${systemPrompt}\n\n${userPrompt}`,
        textGenerationConfig: {
          maxTokenCount: 2000,
          temperature: 0.2,
          topP: 0.9,
        }
      };

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify(body),
        contentType: "application/json",
        accept: "application/json",
      });

      response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return parseAIResponse(responseBody.results?.[0]?.outputText);

    } else if (BEDROCK_MODEL_ID.includes('mistral')) {
      // Mistral format
      const body = {
        prompt: `<s>[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`,
        max_tokens: 2000,
        temperature: 0.2,
      };

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify(body),
        contentType: "application/json",
        accept: "application/json",
      });

      response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return parseAIResponse(responseBody.outputs?.[0]?.text);

    } else {
      // Generic format (attempt with Claude structure)
      const body = {
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        max_tokens: 2000,
        temperature: 0.2,
      };

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify(body),
        contentType: "application/json",
        accept: "application/json",
      });

      response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return parseAIResponse(responseBody.completion || responseBody.output || responseBody.generated_text);
    }

  } catch (error) {
    console.error('Bedrock API error:', error);
    // Fallback to heuristic
    return heuristicAnalysis(questionText, currentAnswer);
  }
}

/**
 * Parse AI response to extract JSON
 */
function parseAIResponse(content: string): AIAnalysisResult {
  try {
    // Extract JSON from markdown code blocks or raw JSON
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    // Clean up any extra text before/after JSON
    const cleanJson = jsonStr.substring(
      jsonStr.indexOf('{'),
      jsonStr.lastIndexOf('}') + 1
    );
    
    const parsed = JSON.parse(cleanJson);
    
    return {
      questionType: parsed.questionType || 'uncertain',
      confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
      correctedAnswer: parsed.correctedAnswer || {},
      correctedQuestionText: parsed.correctedQuestionText || '',
      suggestedOptions: parsed.suggestedOptions,
      reasoning: parsed.reasoning || '',
      flags: parsed.flags || [],
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      questionType: 'uncertain',
      confidence: 50,
      correctedAnswer: {},
      correctedQuestionText: '',
      reasoning: 'Parse error',
      flags: ['AI response parsing failed'],
    };
  }
}

/**
 * Fallback heuristic analysis
 */
function heuristicAnalysis(questionText: string, currentAnswer: any): AIAnalysisResult {
  const text = questionText.toLowerCase();
  const answerStr = JSON.stringify(currentAnswer).toLowerCase();
  const flags: string[] = [];
  
  // RATIO detection
  if (text.includes('ratio') || text.includes('proportional') || /\d+\s+and\s+\d+/.test(answerStr)) {
    const match = answerStr.match(/(\d+(?:\.\d+)?)\s+(?:and|to|:)\s+(\d+(?:\.\d+)?)/);
    if (match) {
      return {
        questionType: 'ratio',
        confidence: 85,
        correctedAnswer: { values: [parseFloat(match[1]), parseFloat(match[2])] },
        correctedQuestionText: questionText,
        reasoning: 'Detected ratio pattern: "X and Y" or "X:Y"',
        flags: ['Heuristic - verify ratio values are in correct order'],
      };
    }
  }
  
  // FRACTION detection
  if (/\d+\/\d+/.test(answerStr) || text.includes('fraction')) {
    const match = answerStr.match(/(\d+)\/(\d+)/);
    if (match) {
      return {
        questionType: 'fraction',
        confidence: 85,
        correctedAnswer: { numerator: parseInt(match[1]), denominator: parseInt(match[2]) },
        correctedQuestionText: questionText,
        reasoning: 'Detected fraction: X/Y',
        flags: [],
      };
    }
  }
  
  // BOOLEAN detection
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
      reasoning: 'Question format clearly indicates boolean type',
      flags: [],
    };
  }
  
  // NUMERIC detection (time, speed, count questions)
  const timeMatch = text.match(/how many (days?|hours?|minutes?|seconds?)/);
  const numMatch = answerStr.match(/(\d+(?:\.\d+)?)/);
  if (timeMatch && numMatch) {
    return {
      questionType: 'numeric',
      confidence: 80,
      correctedAnswer: { value: parseFloat(numMatch[1]) },
      correctedQuestionText: questionText,
      reasoning: `Detected "how many ${timeMatch[1]}" question with numeric answer`,
      flags: [],
    };
  }
  
  // Generic numeric
  if (numMatch && !text.includes('mcq') && !text.includes('option')) {
    return {
      questionType: 'numeric',
      confidence: 65,
      correctedAnswer: { value: parseFloat(numMatch[1]) },
      correctedQuestionText: questionText,
      reasoning: 'Numeric value detected as answer',
      flags: ['Low confidence - manual verification recommended'],
    };
  }
  
  // Default uncertain
  return {
    questionType: 'uncertain',
    confidence: 40,
    correctedAnswer: currentAnswer,
    correctedQuestionText: questionText,
    reasoning: 'Could not determine type heuristically',
    flags: ['Requires AI analysis or manual review'],
  };
}

/**
 * Validate and fix answer format
 */
function validateAnswerFormat(type: string, answer: any): { valid: boolean; fixed: any; errors: string[] } {
  const errors: string[] = [];
  
  switch (type) {
    case 'mcq_single':
      if (!answer?.value || !['A', 'B', 'C', 'D'].includes(answer.value)) {
        errors.push('MCQ answer must be A, B, C, or D');
        return { valid: false, fixed: { value: 'A' }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'boolean':
      if (typeof answer?.value !== 'boolean') {
        const val = String(answer?.value).toLowerCase();
        const boolVal = val === 'true' || val === 'yes' || val === '1';
        errors.push('Boolean answer fixed');
        return { valid: false, fixed: { value: boolVal }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'ratio':
      if (!answer?.values || !Array.isArray(answer.values) || answer.values.length < 2) {
        errors.push('Ratio must have values array [x, y]');
        return { valid: false, fixed: { values: [1, 1] }, errors };
      }
      // Ensure all values are numbers
      const cleanValues = answer.values.map((v: any) => parseFloat(v) || 0);
      return { valid: true, fixed: { values: cleanValues }, errors };
      
    case 'fraction':
      if (typeof answer?.numerator !== 'number' || typeof answer?.denominator !== 'number') {
        errors.push('Fraction must have numeric numerator and denominator');
        return { valid: false, fixed: { numerator: 0, denominator: 1 }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'numeric':
      if (typeof answer?.value !== 'number') {
        const num = parseFloat(answer);
        if (!isNaN(num)) {
          errors.push('Answer converted to numeric format');
          return { valid: false, fixed: { value: num }, errors };
        }
        errors.push('Could not parse numeric value');
        return { valid: false, fixed: { value: 0 }, errors };
      }
      // Strip units from numeric - they should be in question text
      return { valid: true, fixed: { value: answer.value }, errors };
      
    case 'fill_in_blank':
      if (!answer?.answers || !Array.isArray(answer.answers)) {
        errors.push('Fill in blank must have answers array');
        return { valid: false, fixed: { answers: [''] }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    default:
      errors.push(`Unknown question type: ${type}`);
      return { valid: false, fixed: answer, errors };
  }
}

/**
 * Main batch processor
 */
async function processQuestions(limit: number = 100, dryRun: boolean = false): Promise<void> {
  console.log('🤖 AWS Bedrock Question Processor');
  console.log('===================================');
  console.log(`Model: ${BEDROCK_MODEL_ID}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Auto-approve threshold: ${AUTO_APPROVE_THRESHOLD}%\n`);
  
  try {
    // Get pending questions
    const { questions } = await reviewModel.getPendingPaginated(
      {},
      { page: 1, limit, offset: 0 }
    );
    
    console.log(`Found ${questions.length} pending questions\n`);
    
    let approved = 0;
    let flagged = 0;
    let errors = 0;
    const typeStats: Record<string, number> = {};
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`[${i + 1}/${questions.length}] Processing ID ${q.id}...`);
      
      try {
        // Analyze question
        const analysis = await analyzeWithBedrock(
          q.question_text,
          q.correct_answer,
          q.detected_question_type
        );
        
        // Track stats
        typeStats[analysis.questionType] = (typeStats[analysis.questionType] || 0) + 1;
        
        // Validate format
        const validation = validateAnswerFormat(
          analysis.questionType, 
          analysis.correctedAnswer
        );
        
        if (!validation.valid) {
          analysis.correctedAnswer = validation.fixed;
          analysis.flags.push(...validation.errors);
          analysis.confidence = Math.max(analysis.confidence - 10, 50);
        }
        
        const shouldApprove = analysis.confidence >= AUTO_APPROVE_THRESHOLD && 
                              analysis.questionType !== 'uncertain';
        
        // Log result
        const status = shouldApprove ? '✅ AUTO-APPROVE' : '⚠️ FLAG';
        console.log(`  ${status} | Type: ${analysis.questionType} | Confidence: ${analysis.confidence}%`);
        console.log(`  Reasoning: ${analysis.reasoning.substring(0, 100)}...`);
        
        if (analysis.flags.length > 0) {
          console.log(`  Flags: ${analysis.flags.join(', ')}`);
        }
        
        // Execute if not dry run
        if (!dryRun) {
          if (shouldApprove) {
            await approveQuestion(q, analysis);
            approved++;
          } else {
            await updateWithSuggestions(q.id, q, analysis);
            flagged++;
          }
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 300));
        
      } catch (err) {
        console.error(`  ❌ Error:`, err);
        errors++;
      }
      
      console.log('');
    }
    
    // Final summary
    console.log('\n📊 PROCESSING COMPLETE');
    console.log('======================');
    console.log(`Total: ${questions.length}`);
    if (!dryRun) {
      console.log(`Auto-approved: ${approved}`);
      console.log(`Flagged: ${flagged}`);
    }
    console.log(`Errors: ${errors}`);
    console.log('\nQuestion type distribution:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Approve question with fixes
 */
async function approveQuestion(original: any, analysis: any): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Update pending
    await conn.execute(
      `UPDATE review_pending_questions 
       SET final_question_type = ?, 
           question_text = ?,
           correct_answer = ?,
           grading_config = ?,
           options = ?,
           status = 'approved'
       WHERE id = ?`,
      [
        analysis.questionType,
        analysis.correctedQuestionText || original.question_text,
        JSON.stringify(analysis.correctedAnswer),
        JSON.stringify({ type: analysis.questionType, marks: 1, negativeMarks: 0 }),
        analysis.suggestedOptions ? JSON.stringify(analysis.suggestedOptions) : original.options,
        original.id
      ]
    );
    
    // Insert to questions
    await conn.execute(
      `INSERT INTO questions 
       (category, subcategory, difficulty, question_type, question_text, 
        passage, data_block, options, correct_answer, grading_config, 
        solution, source_file, source_question_no, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        original.category,
        original.subcategory,
        original.difficulty || 'basic',
        analysis.questionType,
        analysis.correctedQuestionText || original.question_text,
        original.passage,
        original.data_block,
        analysis.suggestedOptions ? JSON.stringify(analysis.suggestedOptions) : original.options,
        JSON.stringify(analysis.correctedAnswer),
        JSON.stringify({ type: analysis.questionType, marks: 1, negativeMarks: 0 }),
        original.solution,
        original.source_file,
        original.source_question_no,
      ]
    );
    
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Update with suggestions but keep in pending
 */
async function updateWithSuggestions(id: number, original: any, analysis: any): Promise<void> {
  await pool.execute(
    `UPDATE review_pending_questions 
     SET final_question_type = ?, 
         question_text = ?,
         correct_answer = ?,
         grading_config = ?,
         options = ?
     WHERE id = ?`,
    [
      analysis.questionType,
      analysis.correctedQuestionText || original.question_text,
      JSON.stringify(analysis.correctedAnswer),
      JSON.stringify({ type: analysis.questionType, marks: 1, negativeMarks: 0 }),
      analysis.suggestedOptions ? JSON.stringify(analysis.suggestedOptions) : original.options,
      id
    ]
  );
}

// CLI Runner
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
  
  // Validate env vars
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ Set AWS credentials:');
    console.error('  export AWS_ACCESS_KEY_ID=xxx');
    console.error('  export AWS_SECRET_ACCESS_KEY=xxx');
    console.error('  export AWS_REGION=us-east-1');
    process.exit(1);
  }
  
  await processQuestions(limit, dryRun);
}

if (require.main === module) {
  main();
}

export { analyzeWithBedrock, processQuestions };
