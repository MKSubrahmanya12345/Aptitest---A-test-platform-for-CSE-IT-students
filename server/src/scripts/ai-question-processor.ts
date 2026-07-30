/**
 * AI-Powered Question Processor
 * 
 * Processes pending questions using AI to:
 * 1. Determine optimal question type
 * 2. Fix answer formats
 * 3. Auto-approve high confidence questions
 * 4. Flag uncertain ones for manual review
 * 
 * Usage: ts-node ai-question-processor.ts [--dry-run] [--limit=100]
 */

import pool from '../config/db';
import { reviewModel } from '../models/review.model';
import type { PoolConnection } from 'mysql2/promise';

// Configure your LLM API here (OpenAI, Claude, etc.)
const LLM_API_KEY = process.env.OPENAI_API_KEY || 'your-api-key-here';
const LLM_API_URL = 'https://api.openai.com/v1/chat/completions';
const LLM_MODEL = 'gpt-4';

// AUTO-APPROVE threshold (0-100)
const AUTO_APPROVE_THRESHOLD = 95;

// Batch size for processing
const BATCH_SIZE = 10;

interface AIAnalysisResult {
  questionType: 'mcq_single' | 'boolean' | 'fraction' | 'ratio' | 'numeric' | 'fill_in_blank' | 'uncertain';
  confidence: number;
  correctedAnswer: any;
  correctedQuestionText: string;
  suggestedOptions?: { key: string; text: string }[];
  reasoning: string;
  flags: string[];
}

interface ProcessedQuestion {
  id: number;
  originalQuestion: string;
  originalAnswer: any;
  analysis: AIAnalysisResult;
  shouldAutoApprove: boolean;
}

/**
 * Call LLM API to analyze question
 */
async function analyzeQuestionWithAI(
  questionText: string,
  currentAnswer: any,
  detectedType?: string
): Promise<AIAnalysisResult> {
  const prompt = `You are an expert aptitude test question analyzer. Analyze this question and determine the optimal question type and answer format.

QUESTION TEXT: "${questionText}"

CURRENT ANSWER VALUE: ${JSON.stringify(currentAnswer)}

DETECTED TYPE (may be wrong): ${detectedType || 'unknown'}

Available question types:
1. mcq_single - Multiple choice with single answer (A, B, C, D) - REQUIRES 4 OPTIONS
2. boolean - True/False or Yes/No
3. fraction - Numerator/Denominator like 3/4
4. ratio - Ratios like 3:4 or "3 to 4" - stored as {values: [3, 4]}
5. numeric - Plain numbers (integers, decimals) - stored as {value: number}
6. fill_in_blank - Fill in the blank

RULES:
- If question asks "how many", "what is the value", "find the number" → numeric
- If question has "ratio of", "in the ratio", "proportional to" → ratio (format as values array)
- If answer is like "20 and 30" with ratio context → ratio {values: [20, 30]}
- If question mentions "true/false", "correct/incorrect" → boolean
- If question has clear A/B/C/D options mentioned → mcq_single
- Text answers without clear options → fill_in_blank or mcq_single with generated options
- "4 days", "5 hours" → numeric (just the number, unit goes in question text)

ANALYZE AND RETURN JSON ONLY:
{
  "questionType": "<one of the types above>",
  "confidence": <0-100>,
  "correctedAnswer": <properly formatted JSON object>,
  "correctedQuestionText": "<improved question text if needed>",
  "suggestedOptions": [{"key": "A", "text": "..."}, ...] // ONLY if mcq_single, include 4 options
  "reasoning": "<explanation of your decision>",
  "flags": ["<any warnings or notes>"]
}
`;

  try {
    const response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/({[\s\S]*})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    return JSON.parse(jsonStr) as AIAnalysisResult;
  } catch (error) {
    console.error('AI Analysis failed:', error);
    // Fallback to heuristic analysis
    return heuristicAnalysis(questionText, currentAnswer);
  }
}

/**
 * Fallback heuristic analysis when AI is unavailable
 */
function heuristicAnalysis(questionText: string, currentAnswer: any): AIAnalysisResult {
  const text = questionText.toLowerCase();
  const answerStr = JSON.stringify(currentAnswer).toLowerCase();
  const flags: string[] = [];
  
  // Check for ratio patterns
  if (text.includes('ratio') || text.includes('proportional') || /\d+\s+and\s+\d+/.test(answerStr)) {
    const match = answerStr.match(/(\d+)\s+(?:and|to|:)\s+(\d+)/);
    if (match) {
      return {
        questionType: 'ratio',
        confidence: 85,
        correctedAnswer: { values: [parseInt(match[1]), parseInt(match[2])] },
        correctedQuestionText: questionText,
        reasoning: 'Detected ratio pattern in answer',
        flags: ['Heuristic fallback - verify ratio order is correct'],
      };
    }
  }
  
  // Check for boolean
  if (text.includes('true or false') || text.includes('yes or no')) {
    const isTrue = /true|yes/.test(answerStr);
    return {
      questionType: 'boolean',
      confidence: 90,
      correctedAnswer: { value: isTrue },
      correctedQuestionText: questionText,
      suggestedOptions: [
        { key: 'true', text: 'True' },
        { key: 'false', text: 'False' }
      ],
      reasoning: 'Question format indicates boolean',
      flags: [],
    };
  }
  
  // Check for fraction
  if (/\d+\/\d+/.test(answerStr) || text.includes('fraction')) {
    const match = answerStr.match(/(\d+)\/(\d+)/);
    if (match) {
      return {
        questionType: 'fraction',
        confidence: 85,
        correctedAnswer: { numerator: parseInt(match[1]), denominator: parseInt(match[2]) },
        correctedQuestionText: questionText,
        reasoning: 'Detected fraction pattern',
        flags: [],
      };
    }
  }
  
  // Check for plain number (numeric)
  const numMatch = answerStr.match(/(\d+(?:\.\d+)?)/);
  if (numMatch && !text.includes('mcq') && !text.includes('option')) {
    return {
      questionType: 'numeric',
      confidence: 70,
      correctedAnswer: { value: parseFloat(numMatch[1]) },
      correctedQuestionText: questionText,
      reasoning: 'Numeric value detected',
      flags: ['Low confidence - verify numeric is correct type'],
    };
  }
  
  // Default to uncertain
  return {
    questionType: 'uncertain',
    confidence: 50,
    correctedAnswer: currentAnswer,
    correctedQuestionText: questionText,
    reasoning: 'Could not determine type heuristically',
    flags: ['Requires manual review'],
  };
}

/**
 * Validate and fix answer format based on question type
 */
function validateAnswerFormat(type: string, answer: any): { valid: boolean; fixed: any; errors: string[] } {
  const errors: string[] = [];
  
  switch (type) {
    case 'mcq_single':
      if (!answer || !answer.value || !['A', 'B', 'C', 'D'].includes(answer.value)) {
        errors.push('MCQ answer must have value A, B, C, or D');
        return { valid: false, fixed: { value: 'A' }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'boolean':
      if (typeof answer?.value !== 'boolean') {
        errors.push('Boolean answer must have boolean value');
        // Try to convert
        const boolValue = /true|yes|1/.test(String(answer?.value).toLowerCase());
        return { valid: false, fixed: { value: boolValue }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'ratio':
      if (!answer?.values || !Array.isArray(answer.values) || answer.values.length < 2) {
        errors.push('Ratio answer must have values array with at least 2 numbers');
        return { valid: false, fixed: { values: [1, 1] }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'fraction':
      if (typeof answer?.numerator !== 'number' || typeof answer?.denominator !== 'number') {
        errors.push('Fraction answer must have numerator and denominator');
        return { valid: false, fixed: { numerator: 0, denominator: 1 }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'numeric':
      if (typeof answer?.value !== 'number') {
        errors.push('Numeric answer must have numeric value');
        const num = parseFloat(answer);
        return { valid: false, fixed: { value: isNaN(num) ? 0 : num }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    case 'fill_in_blank':
      if (!answer?.answers || !Array.isArray(answer.answers)) {
        errors.push('Fill in blank answer must have answers array');
        return { valid: false, fixed: { answers: [''] }, errors };
      }
      return { valid: true, fixed: answer, errors };
      
    default:
      errors.push(`Unknown question type: ${type}`);
      return { valid: false, fixed: answer, errors };
  }
}

/**
 * Process a batch of questions
 */
async function processBatch(questionIds: number[], dryRun: boolean = false): Promise<ProcessedQuestion[]> {
  const results: ProcessedQuestion[] = [];
  
  for (const id of questionIds) {
    console.log(`\nProcessing question ${id}...`);
    
    try {
      // Fetch question
      const question = await reviewModel.getPendingById(id);
      if (!question) {
        console.log(`  ⚠️ Question ${id} not found`);
        continue;
      }
      
      // Analyze with AI
      const analysis = await analyzeQuestionWithAI(
        question.question_text,
        question.correct_answer,
        question.detected_question_type
      );
      
      // Validate and fix answer format
      const validation = validateAnswerFormat(
        analysis.questionType,
        analysis.correctedAnswer
      );
      
      if (!validation.valid) {
        analysis.correctedAnswer = validation.fixed;
        analysis.flags.push(...validation.errors);
        analysis.confidence = Math.max(analysis.confidence - 10, 50);
      }
      
      // Determine if should auto-approve
      const shouldAutoApprove = analysis.confidence >= AUTO_APPROVE_THRESHOLD && 
                                 analysis.questionType !== 'uncertain' &&
                                 validation.valid;
      
      const processed: ProcessedQuestion = {
        id,
        originalQuestion: question.question_text,
        originalAnswer: question.correct_answer,
        analysis,
        shouldAutoApprove,
      };
      
      results.push(processed);
      
      // Log results
      console.log(`  Type: ${analysis.questionType} (confidence: ${analysis.confidence}%)`);
      console.log(`  Auto-approve: ${shouldAutoApprove ? 'YES ✅' : 'NO ⚠️'}`);
      if (analysis.flags.length > 0) {
        console.log(`  Flags: ${analysis.flags.join(', ')}`);
      }
      
      // Execute database operations (unless dry run)
      if (!dryRun) {
        if (shouldAutoApprove) {
          await approveQuestion(id, question, analysis);
        } else {
          await flagQuestion(id, question, analysis);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing question ${id}:`, error);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

/**
 * Auto-approve question with fixes
 */
async function approveQuestion(
  id: number,
  original: any,
  analysis: AIAnalysisResult
): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Update pending question
    await reviewModel.updatePending(id, {
      final_question_type: analysis.questionType,
      question_text: analysis.correctedQuestionText,
      correct_answer: analysis.correctedAnswer,
      grading_config: { type: analysis.questionType, marks: 1, negativeMarks: 0 },
      options: analysis.suggestedOptions || null,
    });
    
    // Move to approved
    await reviewModel.setPendingStatus(id, 'approved', connection);
    
    // Insert into questions table
    await reviewModel.insertQuestion({
      category: original.category,
      subcategory: original.subcategory,
      difficulty: original.difficulty || 'basic',
      question_type: analysis.questionType,
      question_text: analysis.correctedQuestionText,
      passage: original.passage,
      data_block: original.data_block,
      options: analysis.suggestedOptions || original.options,
      correct_answer: analysis.correctedAnswer,
      grading_config: { type: analysis.questionType, marks: 1, negativeMarks: 0 },
      solution: original.solution,
      source_file: original.source_file,
      source_question_no: original.source_question_no,
    }, connection);
    
    await connection.commit();
    console.log(`  ✅ Auto-approved and moved to questions table`);
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Flag question for manual review with suggestions
 */
async function flagQuestion(
  id: number,
  original: any,
  analysis: AIAnalysisResult
): Promise<void> {
  // Update with suggestions but keep in pending
  await reviewModel.updatePending(id, {
    final_question_type: analysis.questionType,
    question_text: analysis.correctedQuestionText,
    correct_answer: analysis.correctedAnswer,
    grading_config: { type: analysis.questionType, marks: 1, negativeMarks: 0 },
    options: analysis.suggestedOptions || original.options,
  });
  
  console.log(`  ⚠️ Flagged for manual review with suggestions`);
}

/**
 * Main processor function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
  
  console.log('🤖 AI Question Processor');
  console.log('========================');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no DB changes)' : 'LIVE'}`);
  console.log(`Limit: ${limit} questions`);
  console.log(`Auto-approve threshold: ${AUTO_APPROVE_THRESHOLD}%\n`);
  
  // Verify API key
  if (LLM_API_KEY === 'your-api-key-here') {
    console.error('❌ Please set your LLM API key in the LLM_API_KEY variable');
    process.exit(1);
  }
  
  try {
    // Get pending questions
    const { questions } = await reviewModel.getPendingPaginated(
      {},
      { page: 1, limit, offset: 0 }
    );
    
    console.log(`Found ${questions.length} pending questions\n`);
    
    if (questions.length === 0) {
      console.log('No questions to process. Exiting.');
      return;
    }
    
    // Process in batches
    const ids = questions.map(q => q.id);
    const results = await processBatch(ids, dryRun);
    
    // Summary
    console.log('\n\n📊 PROCESSING SUMMARY');
    console.log('=====================');
    console.log(`Total processed: ${results.length}`);
    console.log(`Auto-approved: ${results.filter(r => r.shouldAutoApprove).length}`);
    console.log(`Flagged for review: ${results.filter(r => !r.shouldAutoApprove).length}`);
    
    // Type breakdown
    const typeCounts: Record<string, number> = {};
    results.forEach(r => {
      typeCounts[r.analysis.questionType] = (typeCounts[r.analysis.questionType] || 0) + 1;
    });
    
    console.log('\nDetected types:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Save detailed report
    const reportPath = `./ai-processing-report-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { analyzeQuestionWithAI, processBatch, validateAnswerFormat };
