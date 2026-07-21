import fs from 'fs';
import path from 'path';
import pool from '../config/db';

interface ParsedQuestion {
  category: string;
  subcategory: string;
  difficulty: string;
  detected_question_type: string;
  question_text: string;
  passage: string | null;
  data_block: any | null;
  options: any | null;
  correct_answer: any;
  grading_config: any;
  solution: string;
  source_file: string;
  source_question_no: number;
  parser_confidence: number;
  warnings: string[];
}

// Helper to clean up category name
function cleanCategory(folderName: string): string {
  // Remove numbers and parenthesis, e.g. "01 Quantitative Aptitude (Numerical Ability)" -> "Quantitative Aptitude"
  let name = folderName.replace(/^\d+\s+/, ''); // Remove leading numbers
  const parenIdx = name.indexOf('(');
  if (parenIdx !== -1) {
    name = name.substring(0, parenIdx);
  }
  return name.trim();
}

// Helper to clean up difficulty
function cleanDifficulty(folderName: string): string {
  // e.g. "01 Basic" -> "basic"
  const name = folderName.replace(/^\d+\s+/, '').toLowerCase().trim();
  if (name === 'advance') return 'advanced';
  return name;
}

// Helper to parse options from question text
function parseOptions(questionText: string): { options: any[] | null; cleanedText: string } {
  // Matches A) ... B) ... C) ... D) ... or A. ... B. ... C. ... D. ...
  // Can be inline or on separate lines
  const regex = /(?:^|\s)A[).]\s*([\s\S]+?)\s+B[).]\s*([\s\S]+?)\s+C[).]\s*([\s\S]+?)\s+D[).]\s*([\s\S]+?)(?=$|\n\n|\s*\*\*Solution)/i;
  const match = questionText.match(regex);

  if (match) {
    const options = [
      { key: 'A', text: (match[1] || '').trim() },
      { key: 'B', text: (match[2] || '').trim() },
      { key: 'C', text: (match[3] || '').trim() },
      { key: 'D', text: (match[4] || '').trim() }
    ];
    // Clean option text by removing markdown list syntax if any
    options.forEach(opt => {
      opt.text = opt.text.replace(/^[-\s*+]+/, '').trim();
    });

    // Strip options from question text
    const optStartIdx = questionText.indexOf(match[0] || '');
    let cleanedText = questionText;
    if (optStartIdx !== -1) {
      cleanedText = questionText.substring(0, optStartIdx).trim();
    }
    return { options, cleanedText };
  }
  return { options: null, cleanedText: questionText };
}

// Helper to check if string is numeric
function isNumeric(str: string): boolean {
  const cleaned = str.replace(/,/g, '').trim();
  return !isNaN(parseFloat(cleaned)) && isFinite(Number(cleaned));
}

// Parse numeric answer with unit
function parseNumericWithUnit(rawText: string) {
  const txt = rawText.trim().replace(/,/g, '');
  let unit: string | null = null;
  let valStr = "";

  // Check for prefix unit (e.g. $180)
  const prefixMatch = txt.match(/^([$£€])\s*(\d+(?:\.\d+)?)/);
  if (prefixMatch) {
    unit = prefixMatch[1] || null;
    valStr = prefixMatch[2] || "";
  } else {
    // Check for suffix unit (e.g. 60 km/h, 5 days, 50 cm²)
    const suffixMatch = txt.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
    if (suffixMatch) {
      valStr = suffixMatch[1] || "";
      unit = (suffixMatch[2] || "").trim() || null;
    }
  }

  if (valStr) {
    return {
      value: parseFloat(valStr),
      unit: unit
    };
  }
  return null;
}

// Parse fraction (e.g. 1/2, 3/8)
function parseFraction(rawText: string) {
  const match = rawText.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (match) {
    return {
      numerator: parseInt(match[1] || '0'),
      denominator: parseInt(match[2] || '1')
    };
  }
  return null;
}

// Parse ratio (e.g. 8:15, 6:5)
function parseRatio(rawText: string) {
  const match = rawText.trim().match(/^(\d+)\s*:\s*(\d+)$/);
  if (match) {
    return [parseInt(match[1] || '1'), parseInt(match[2] || '1')];
  }
  return null;
}

// Classify question type and prepare correct_answer and grading_config
function classifyAndProcess(
  qText: string,
  rawAnswer: string,
  filePath: string,
  subcategory: string,
  options: any[] | null
): { type: string; correctAnswer: any; gradingConfig: any; confidence: number; warnings: string[] } {

  const textLower = qText.toLowerCase();
  const ansLower = rawAnswer.toLowerCase().trim();
  const warnings: string[] = [];
  let confidence = 0.90;

  // Rule 1: options A/B/C/D present -> mcq_single
  if (options) {
    let correctKey = "";
    // Check if raw answer indicates key (e.g. "B) Plentiful" or "Answer is B" or just "B")
    const keyMatch = ansLower.match(/^\s*([a-d])(?:\)|\.|\s|$)/i);
    if (keyMatch) {
      correctKey = (keyMatch[1] || '').toUpperCase();
    } else {
      // Look for the exact text of options in the answer
      const foundOpt = options.find(o => ansLower.includes(o.text.toLowerCase()));
      if (foundOpt) {
        correctKey = foundOpt.key;
      } else {
        // Warning: options present but couldn't parse correct key
        correctKey = "A"; // default fallback
        warnings.push("MCQ option key could not be determined from answer");
        confidence = 0.5;
      }
    }

    return {
      type: 'mcq_single',
      correctAnswer: { value: correctKey },
      gradingConfig: {},
      confidence,
      warnings
    };
  }

  // Rule 2: file is under Data Interpretation -> data_interpretation
  if (filePath.toLowerCase().includes('data interpretation')) {
    // A DI question might actually be numeric or text, but we categorize it as DI
    const numWithUnit = parseNumericWithUnit(rawAnswer);
    if (numWithUnit) {
      return {
        type: 'data_interpretation',
        correctAnswer: { value: numWithUnit.value, unit: numWithUnit.unit },
        gradingConfig: { tolerance: 0.01 },
        confidence: 0.85,
        warnings
      };
    }
    return {
      type: 'data_interpretation',
      correctAnswer: { value: rawAnswer.trim() },
      gradingConfig: { case_sensitive: false, ignore_punctuation: true },
      confidence: 0.8,
      warnings
    };
  }

  // Rule 3: heading has "Jumbled Sentences" or "ordering" -> ordering
  if (subcategory.toLowerCase().includes('jumbled') || subcategory.toLowerCase().includes('ordering')) {
    // Try to extract order like A-B-C-D or C, D, A, B
    const orderMatch = ansLower.replace(/[-\s,]+/g, '').match(/^[a-d]{4}$/);
    if (orderMatch) {
      const order = orderMatch[0].toUpperCase().split('');
      return {
        type: 'ordering',
        correctAnswer: { order },
        gradingConfig: {},
        confidence: 0.95,
        warnings
      };
    } else {
      // If it is jumbled but gives a sentence instead of labels
      return {
        type: 'short_text',
        correctAnswer: { answers: [rawAnswer.trim()] },
        gradingConfig: { case_sensitive: false, ignore_punctuation: true },
        confidence: 0.7,
        warnings: ["Jumbled sentence answer parsed as short_text because no A-B-C-D order label was detected"]
      };
    }
  }

  // Rule 4: heading has "Sentence Correction" -> sentence_correction
  if (subcategory.toLowerCase().includes('sentence correction')) {
    return {
      type: 'sentence_correction',
      correctAnswer: { answers: [rawAnswer.trim()] },
      gradingConfig: { case_sensitive: false, ignore_punctuation: true },
      confidence: 0.8,
      warnings
    };
  }

  // Rule 5: heading has "Reading Comprehension" -> reading_comprehension
  if (subcategory.toLowerCase().includes('reading comprehension')) {
    return {
      type: 'reading_comprehension',
      correctAnswer: { answers: [rawAnswer.trim()] },
      gradingConfig: { case_sensitive: false, ignore_punctuation: true },
      confidence: 0.75,
      warnings: ["Reading comprehension questions are open-ended; verify answer key"]
    };
  }

  // Rule 6: question mentions "output of this code" or "output of:" -> code_output
  if (textLower.includes('output of') || textLower.includes('what is the output')) {
    return {
      type: 'code_output',
      correctAnswer: { answers: [rawAnswer.trim()] },
      gradingConfig: { case_sensitive: true, ignore_trailing_spaces: true },
      confidence: 0.9,
      warnings
    };
  }

  // Rule 7: answer is Yes/No -> boolean
  if (ansLower === 'yes' || ansLower === 'no' || ansLower === 'true' || ansLower === 'false') {
    const val = (ansLower === 'yes' || ansLower === 'true');
    return {
      type: 'boolean',
      correctAnswer: { value: val },
      gradingConfig: { accepted: val ? ['yes', 'y', 'true'] : ['no', 'n', 'false'] },
      confidence: 0.95,
      warnings
    };
  }

  // Rule 8: answer has "/" like 1/2 -> fraction
  const fraction = parseFraction(rawAnswer);
  if (fraction) {
    return {
      type: 'fraction',
      correctAnswer: fraction,
      gradingConfig: { allow_decimal_equivalent: true },
      confidence: 0.95,
      warnings
    };
  }

  // Rule 9: answer has ":" like 8:15 -> ratio
  const ratio = parseRatio(rawAnswer);
  if (ratio) {
    return {
      type: 'ratio',
      correctAnswer: { values: ratio },
      gradingConfig: { allow_scaled_equivalent: true },
      confidence: 0.95,
      warnings
    };
  }

  // Rule 10: answer is a bare number -> numeric
  const cleanAns = ansLower.replace(/,/g, '').trim();
  if (isNumeric(cleanAns)) {
    return {
      type: 'numeric',
      correctAnswer: { value: parseFloat(cleanAns) },
      gradingConfig: { tolerance: 0.01 },
      confidence: 0.95,
      warnings
    };
  }

  // Rule 11: number + unit -> numeric_with_unit
  const numWithUnit = parseNumericWithUnit(rawAnswer);
  if (numWithUnit && numWithUnit.unit) {
    return {
      type: 'numeric_with_unit',
      correctAnswer: { value: numWithUnit.value, unit: numWithUnit.unit },
      gradingConfig: { tolerance: 0.01, unit_required: false },
      confidence: 0.9,
      warnings
    };
  }

  // Fallback -> short_text
  return {
    type: 'short_text',
    correctAnswer: { answers: [rawAnswer.trim()] },
    gradingConfig: { case_sensitive: false, ignore_punctuation: true, trim_spaces: true },
    confidence: 0.8,
    warnings: rawAnswer.trim().split(/\s+/).length > 6 ? ["Long text answer. Check if autograding is fair."] : []
  };
}

// Parse markdown file into questions
function parseMarkdownFile(filePath: string, relativePath: string): ParsedQuestion[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Extract category and difficulty from file path
  // e.g. path: ...\01 Quantitative Aptitude (Numerical Ability)\01 Basic\README.md
  const parts = filePath.split(path.sep);
  const categoryFolder = parts[parts.length - 3] || "";
  const difficultyFolder = parts[parts.length - 2] || "";

  const category = cleanCategory(categoryFolder);
  const difficulty = cleanDifficulty(difficultyFolder);

  const questions: any[] = [];

  let currentSubcategory = "";
  let currentContext = "";
  let hadQuestionsInCurrentContext = false;

  let currentQuestion: any = null;
  let currentState: 'none' | 'question' | 'solution' | 'answer' = 'none';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    const trimmedLine = line.trim();

    // Check for headings (e.g. ## Percentages)
    const headingMatch = trimmedLine.match(/^##\s+(.*)/);
    if (headingMatch) {
      // If there was an active question, push it
      if (currentQuestion) {
        questions.push(currentQuestion);
        currentQuestion = null;
      }
      currentSubcategory = (headingMatch[1] || '').trim();
      // Remove trailing number guides, e.g. "Programming Fundamentals (1–20)" -> "Programming Fundamentals"
      currentSubcategory = currentSubcategory.replace(/\s*\(\d+[-–]\d+\)$/, '').trim();

      currentContext = "";
      hadQuestionsInCurrentContext = false;
      currentState = 'none';
      continue;
    }

    // Check for Question start
    const questionMatch = trimmedLine.match(/^(\d+)\.\s*\*\*Question\*\*:\s*(.*)/i);
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      currentQuestion = {
        category,
        subcategory: currentSubcategory || 'General',
        difficulty,
        source_question_no: parseInt(questionMatch[1] || '0'),
        source_file: relativePath,
        question_text: questionMatch[2],
        passage: currentContext ? currentContext.trim() : null,
        data_block: null,
        options: null,
        correct_answer: null,
        grading_config: null,
        solution: "",
        answer_raw: "",
        parser_confidence: 1.0,
        warnings: []
      };

      hadQuestionsInCurrentContext = true;
      currentState = 'question';
      continue;
    }

    // Check for Solution start
    const solutionMatch = trimmedLine.match(/^\s*\*\*Solution\*\*:\s*(.*)/i);
    if (solutionMatch && currentQuestion) {
      currentState = 'solution';
      currentQuestion.solution = solutionMatch[1];
      continue;
    }

    // Check for Answer start
    const answerMatch = trimmedLine.match(/^\s*\*\*(Answer|Corrected|Correct Sentence|Correct Answer|Correct Order)\*\*:\s*(.*)/i);
    if (answerMatch && currentQuestion) {
      currentState = 'answer';
      currentQuestion.answer_raw = answerMatch[2];
      continue;
    }

    // Normal line processing based on state
    if (currentState === 'question' && currentQuestion) {
      currentQuestion.question_text += "\n" + line;
    } else if (currentState === 'solution' && currentQuestion) {
      currentQuestion.solution += "\n" + line;
    } else if (currentState === 'answer' && currentQuestion) {
      currentQuestion.answer_raw += "\n" + line;
    } else if (currentState === 'none') {
      // Accumulate context (e.g. tables, description)
      if (trimmedLine !== "") {
        if (hadQuestionsInCurrentContext) {
          // Reset context if we just completed questions and see new context text
          currentContext = "";
          hadQuestionsInCurrentContext = false;
        }
        currentContext += line + "\n";
      }
    }
  }

  // Push the final question
  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  // Post-process questions: parse options, classify type, format solutions
  const processedQuestions: ParsedQuestion[] = [];
  for (const q of questions) {
    // 1. Clean question text & solutions
    let qText = q.question_text.trim();
    const solution = q.solution.trim();
    const rawAnswer = q.answer_raw.trim();

    // 2. Parse options if present
    const { options, cleanedText } = parseOptions(qText);
    qText = cleanedText;

    // 3. Classify and process correct_answer & grading_config
    const classification = classifyAndProcess(
      qText,
      rawAnswer,
      filePath,
      q.subcategory,
      options
    );

    // 4. Handle data block (tables)
    let passage = q.passage;
    let dataBlock: any = null;
    if (passage && passage.includes('|')) {
      // It has a table, let's tag it as a table data block
      dataBlock = {
        type: 'table',
        markdown: passage
      };
      passage = null; // Clear passage since it's now in dataBlock
    }

    processedQuestions.push({
      category: q.category,
      subcategory: q.subcategory,
      difficulty: q.difficulty,
      detected_question_type: classification.type,
      question_text: qText,
      passage,
      data_block: dataBlock ? JSON.stringify(dataBlock) : null,
      options: options ? JSON.stringify(options) : null,
      correct_answer: JSON.stringify(classification.correctAnswer),
      grading_config: JSON.stringify(classification.gradingConfig),
      solution,
      source_file: q.source_file,
      source_question_no: q.source_question_no,
      parser_confidence: classification.confidence,
      warnings: classification.warnings
    });
  }

  return processedQuestions;
}

// Find all README.md files recursively in the practice hub
function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== '.git' && file !== 'node_modules') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.toLowerCase() === 'readme.md' && dir !== path.resolve(dir, '..')) {
      // Exclude root README.md
      fileList.push(filePath);
    }
  }
  return fileList;
}

/**
 * This function reads all README.md files from the practice hub, parses the questions,
 * and inserts them into the `review_pending_questions` table for admin review.
 */
async function ingestQuestions() {
  console.log("🚀 Starting Question Ingestion...");
  const hubDir = "C:\\Users\\User\\Desktop\\ai_logics\\Aptitest\\CSE-Aptitude-Test-Practice-Hub";
  const connection = await pool.getConnection();

  try {
    if (!fs.existsSync(hubDir)) {
      console.error(`❌ Error: Practice Hub directory not found at ${hubDir}`);
      return;
    }

    const files = findMarkdownFiles(hubDir);
    console.log(`Found ${files.length} practice files to process.`);

    let totalParsed = 0;
    const allQuestions: ParsedQuestion[] = [];

    for (const file of files) {
      const relativePath = path.relative(hubDir, file);
      console.log(`  - Parsing file: ${relativePath}...`);
      try {
        const questions = parseMarkdownFile(file, relativePath);
        console.log(`    Parsed ${questions.length} questions.`);
        allQuestions.push(...questions);
        totalParsed += questions.length;
      } catch (err) {
        console.error(`    Error parsing ${relativePath}:`, err);
      }
    }

    console.log(`\nSuccessfully parsed ${totalParsed} questions total. Inserting into database...`);

    // Fetch approved questions to avoid re-inserting them
    const approvedQuestions = new Set<string>();
    try {
      const [rows]: any = await connection.query("SELECT source_file, source_question_no FROM questions");
      for (const row of rows) {
        if (row.source_file && row.source_question_no !== undefined) {
          approvedQuestions.add(`${row.source_file}::${row.source_question_no}`);
        }
      }
      console.log(`Loaded ${approvedQuestions.size} approved questions from live database to skip.`);
    } catch (err) {
      console.error("Warning: Could not load approved questions:", err);
    }

    // Fetch rejected questions to preserve their status
    const rejectedQuestions = new Set<string>();
    try {
      const [rows]: any = await connection.query("SELECT source_file, source_question_no FROM review_pending_questions WHERE status = 'rejected'");
      for (const row of rows) {
        if (row.source_file && row.source_question_no !== undefined) {
          rejectedQuestions.add(`${row.source_file}::${row.source_question_no}`);
        }
      }
      console.log(`Loaded ${rejectedQuestions.size} previously rejected questions to preserve status.`);
    } catch (err) {
      console.error("Warning: Could not load rejected questions:", err);
    }

    // Clear existing review questions to allow clean run
    try {
      await connection.query("DELETE FROM review_pending_questions WHERE status = 'pending'");
      console.log("Cleared existing 'pending' questions from review table.");
    } catch (err) {
      console.error("Error clearing review_pending_questions:", err);
      // Do not proceed if we can't clear the table
      return;
    }

    let insertedCount = 0;
    let skippedCount = 0;
    for (const q of allQuestions) {
      const key = `${q.source_file}::${q.source_question_no}`;
      if (approvedQuestions.has(key)) {
        skippedCount++;
        continue;
      }

      let status = 'pending';
      if (rejectedQuestions.has(key)) {
        status = 'rejected';
      }

      try {
        const query = `
          INSERT INTO review_pending_questions (
            category, subcategory, difficulty, detected_question_type,
            question_text, passage, data_block, options,
            correct_answer, grading_config, solution,
            source_file, source_question_no, parser_confidence, warnings, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            category=VALUES(category), subcategory=VALUES(subcategory), difficulty=VALUES(difficulty),
            detected_question_type=VALUES(detected_question_type), question_text=VALUES(question_text),
            passage=VALUES(passage), data_block=VALUES(data_block), options=VALUES(options),
            correct_answer=VALUES(correct_answer), grading_config=VALUES(grading_config),
            solution=VALUES(solution), parser_confidence=VALUES(parser_confidence), warnings=VALUES(warnings),
            status=VALUES(status)
        `;

        const values = [
          q.category,
          q.subcategory,
          q.difficulty,
          q.detected_question_type,
          q.question_text,
          q.passage,
          q.data_block,
          q.options,
          q.correct_answer,
          q.grading_config,
          q.solution,
          q.source_file,
          q.source_question_no,
          q.parser_confidence,
          JSON.stringify(q.warnings),
          status
        ];

        await connection.query(query, values);
        insertedCount++;
      } catch (dbErr) {
        console.error(`❌ DB Error inserting question ${q.source_question_no} from ${q.source_file}:`, dbErr);
      }
    }

    console.log(`\n✅ Database insertion complete.`);
    console.log(`   - Inserted/Updated: ${insertedCount} questions.`);
    console.log(`   - Skipped (already approved): ${skippedCount} questions.`);

  } catch (error) {
    console.error("❌ A critical error occurred during the import process:", error);
  } finally {
    if (connection) connection.release();
    await pool.end();
    console.log('👋 Import process finished.');
  }
}

// Run the ingestion script
ingestQuestions();