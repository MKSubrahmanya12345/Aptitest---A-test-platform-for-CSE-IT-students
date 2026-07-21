import pool from "../config/db";

export function safeJsonParse(val: any): any {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return val;
  }
}

// Helper function to grade question answers based on question type and config
export function gradeQuestionAnswer(question: any, userAnswer: any): boolean {
  if (userAnswer === undefined || userAnswer === null) {
    return false;
  }

  // Parse correct_answer and grading_config if they are strings (JSON)
  let correctAnswer = safeJsonParse(question.correct_answer);
  let gradingConfig = safeJsonParse(question.grading_config) || {};

  // Extract answer value from user answer structure
  let uVal: any = userAnswer;
  if (userAnswer && typeof userAnswer === 'object') {
    if ('value' in userAnswer) {
      uVal = userAnswer.value;
    } else if ('answer' in userAnswer) {
      uVal = userAnswer.answer;
    }
  }

  const type = question.question_type;

  switch (type) {
    case 'mcq_single': {
      const correctVal = correctAnswer?.value || '';
      const userVal = String(uVal || '').trim();
      return correctVal.toUpperCase() === userVal.toUpperCase();
    }
    case 'boolean': {
      const correctVal = !!(correctAnswer?.value);
      let userVal = false;
      if (typeof uVal === 'boolean') {
        userVal = uVal;
      } else {
        const s = String(uVal || '').toLowerCase().trim();
        userVal = (s === 'true' || s === 'yes' || s === 'y');
      }
      return correctVal === userVal;
    }
    case 'fraction': {
      const corrNum = Number(correctAnswer?.numerator);
      const corrDen = Number(correctAnswer?.denominator);

      if (typeof uVal === 'object' && uVal !== null) {
        const uNum = Number(uVal.numerator);
        const uDen = Number(uVal.denominator);
        if (corrNum === uNum && corrDen === uDen) return true;
      } else {
        const s = String(uVal || '').trim();
        const match = s.match(/^(\d+)\s*\/\s*(\d+)$/);
        /* old code
        if (match) {
          const uNum = parseInt(match[1]);
          const uDen = parseInt(match[2]);
          if (corrNum === uNum && corrDen === uDen) return true;
        }
        */
        // ??$$$
        if (match) {
          const uNum = parseInt(match[1] as string);
          const uDen = parseInt(match[2] as string);
          if (corrNum === uNum && corrDen === uDen) return true;
        }
      }

      if (gradingConfig.allow_decimal_equivalent) {
        const corrDec = corrNum / corrDen;
        const uDec = parseFloat(String(uVal).replace(/,/g, '').trim());
        if (!isNaN(uDec) && Math.abs(corrDec - uDec) <= 0.01) {
          return true;
        }
      }
      return false;
    }
    case 'ratio': {
      const corrVals = correctAnswer?.values || [];
      if (corrVals.length < 2) return false;
      const cNum = Number(corrVals[0]);
      const cDen = Number(corrVals[1]);

      let uNum = 0, uDen = 0;
      if (typeof uVal === 'object' && Array.isArray(uVal)) {
        uNum = Number(uVal[0]);
        uDen = Number(uVal[1]);
      } else if (typeof uVal === 'object' && uVal !== null && 'values' in uVal) {
        const uArr = uVal.values || [];
        uNum = Number(uArr[0]);
        uDen = Number(uArr[1]);
      } else {
        const s = String(uVal || '').trim();
        const match = s.match(/^(\d+)\s*:\s*(\d+)$/);
        /* old code
        if (match) {
          uNum = parseInt(match[1]);
          uDen = parseInt(match[2]);
        }
        */
        // ??$$$
        if (match) {
          uNum = parseInt(match[1] as string);
          uDen = parseInt(match[2] as string);
        }
      }

      if (uNum === 0 || uDen === 0) return false;

      if (gradingConfig.allow_scaled_equivalent) {
        return cNum * uDen === uNum * cDen;
      } else {
        return cNum === uNum && cDen === uDen;
      }
    }
    case 'numeric':
    case 'data_interpretation':
    case 'numeric_with_unit': {
      const corrNum = Number(correctAnswer?.value);
      const tolerance = Number(gradingConfig.tolerance ?? 0.01);

      let uNumVal = NaN;
      let uUnitVal = '';
      if (typeof uVal === 'object' && uVal !== null) {
        uNumVal = Number(uVal.value);
        uUnitVal = String(uVal.unit || '').trim();
      } else {
        const s = String(uVal || '').trim().replace(/,/g, '');
        const suffixMatch = s.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
        /* old code
        if (suffixMatch) {
          uNumVal = parseFloat(suffixMatch[1]);
          uUnitVal = suffixMatch[2].trim();
        }
        */
        // ??$$$
        if (suffixMatch) {
          uNumVal = parseFloat(suffixMatch[1] as string);
          uUnitVal = (suffixMatch[2] || '').trim();
        } else {
          uNumVal = parseFloat(s);
        }
      }

      if (isNaN(uNumVal)) {
        if (type === 'data_interpretation') {
          const cText = String(correctAnswer?.value || '').trim().toLowerCase();
          const uText = String(uVal || '').trim().toLowerCase();
          return cText === uText;
        }
        return false;
      }

      const diff = Math.abs(corrNum - uNumVal);
      if (diff > tolerance) return false;

      if (type === 'numeric_with_unit' && gradingConfig.unit_required) {
        const corrUnit = String(correctAnswer?.unit || '').trim().toLowerCase();
        return corrUnit === uUnitVal.toLowerCase();
      }

      return true;
    }
    default: {
      let correctAnswers: string[] = [];
      if (correctAnswer && typeof correctAnswer === 'object') {
        if (Array.isArray(correctAnswer.answers)) {
          correctAnswers = correctAnswer.answers;
        } else if (correctAnswer.value) {
          correctAnswers = [correctAnswer.value];
        }
      }
      if (correctAnswers.length === 0) {
        correctAnswers = [String(correctAnswer)];
      }

      const userStr = String(uVal || '');
      const caseSensitive = !!(gradingConfig.case_sensitive);
      const ignorePunctuation = !!(gradingConfig.ignore_punctuation);
      const trimSpaces = gradingConfig.trim_spaces !== false;

      const clean = (s: string) => {
        let res = s;
        if (!caseSensitive) res = res.toLowerCase();
        if (ignorePunctuation) res = res.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        if (trimSpaces) res = res.replace(/\s+/g, " ").trim();
        return res;
      };

      const cleanUser = clean(userStr);
      return correctAnswers.some(ans => clean(ans) === cleanUser);
    }
  }
}

export const testService = {
  // 1. Start a new test session (with multi-category selection checklist and easy/hard difficulty mapping)

  async startSession(
    userId: number,
    categories?: string[],
    difficulty?: string,
    count: number = 10,
    durationSeconds: number = 600
  ) {
    let query = `
      SELECT id 
      FROM questions 
      WHERE status = 'active'
      AND id NOT IN (
        SELECT sq.question_id 
        FROM test_session_questions sq
        JOIN test_sessions s ON sq.session_id = s.id
        WHERE s.user_id = ? AND sq.is_viewed = TRUE
      )
    `;
    const params: any[] = [userId];

    if (categories && categories.length > 0) {
      query += " AND category IN (?)";
      params.push(categories);
    }

    if (difficulty) {
      if (difficulty === 'basic' || difficulty === 'easy') {
        query += " AND difficulty = 'basic'";
      } else if (difficulty === 'advanced' || difficulty === 'intermediate' || difficulty === 'hard') {
        query += " AND difficulty IN ('intermediate', 'advanced')";
      } else {
        query += " AND difficulty = ?";
        params.push(difficulty);
      }
    }

    const [idRows]: any = await pool.query(query, params);
    const availableIds = idRows.map((r: any) => r.id);

    //this is to shuffle the availableIds and select the first 'count' number of questions
    const selectedIds = availableIds.sort(() => 0.5 - Math.random()).slice(0, count);

    let questions: any[] = [];
    if (selectedIds.length > 0) {
      const [rows]: any = await pool.query(
        "SELECT id, category, subcategory, difficulty, question_type, question_text, passage, data_block, options FROM questions WHERE id IN (?)",
        [selectedIds]
      );
      questions = rows;
    }
    //this is a backup query, but learn this again
    if (questions.length < count) {
      const needed = count - questions.length;
      const excludedIds = questions.map((q: any) => q.id);

      let fallbackQuery = "SELECT id FROM questions WHERE status = 'active'";
      const fallbackParams: any[] = [];

      if (excludedIds.length > 0) {
        fallbackQuery += " AND id NOT IN (?)";
        fallbackParams.push(excludedIds);
      }

      if (categories && categories.length > 0) {
        fallbackQuery += " AND category IN (?)";
        fallbackParams.push(categories);
      }

      if (difficulty) {
        if (difficulty === 'basic' || difficulty === 'easy') {
          fallbackQuery += " AND difficulty = 'basic'";
        } else if (difficulty === 'advanced' || difficulty === 'intermediate' || difficulty === 'hard') {
          fallbackQuery += " AND difficulty IN ('intermediate', 'advanced')";
        } else {
          fallbackQuery += " AND difficulty = ?";
          fallbackParams.push(difficulty);
        }
      }

      const [fallbackIdRows]: any = await pool.query(fallbackQuery, fallbackParams);
      const fallbackAvailableIds = fallbackIdRows.map((r: any) => r.id);
      const fallbackSelectedIds = fallbackAvailableIds.sort(() => 0.5 - Math.random()).slice(0, needed);

      if (fallbackSelectedIds.length > 0) {
        const [fallbackRows]: any = await pool.query(
          "SELECT id, category, subcategory, difficulty, question_type, question_text, passage, data_block, options FROM questions WHERE id IN (?)",
          [fallbackSelectedIds]
        );
        questions = [...questions, ...fallbackRows];
      }
    }

    if (questions.length === 0) {
      throw new Error("No active questions found matching the criteria");
    }

    const categoryStr = categories && categories.length > 0 ? categories.join(", ").substring(0, 100) : "Mixed";
    const serverExpiresAt = new Date(Date.now() + durationSeconds * 1000);

    const [sessionResult]: any = await pool.query(
      `INSERT INTO test_sessions (user_id, category, subcategory, difficulty, total_questions, duration_seconds, server_expires_at, is_reattempt, counts_for_stats)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [userId, categoryStr, difficulty || null, questions.length, durationSeconds, serverExpiresAt, false, true]
    );

    const sessionId = sessionResult.insertId;

    const snapshotValues = questions.map((q: any, i: number) => [
      sessionId,
      q.id,
      i + 1,
      1.0
    ]);

    await pool.query(
      "INSERT INTO test_session_questions (session_id, question_id, question_order, marks) VALUES ?",
      [snapshotValues]
    );

    return {
      session_id: sessionId,
      server_expires_at: serverExpiresAt,
      questions: questions.map((q: any) => ({
        id: q.id,
        category: q.category,
        subcategory: q.subcategory,
        difficulty: q.difficulty,
        question_type: q.question_type,
        question_text: q.question_text,
        passage: q.passage,
        data_block: safeJsonParse(q.data_block),
        options: safeJsonParse(q.options),
      }))
    };
  },

  // ??$$$
  // Mark a question as viewed for this session
  async markQuestionAsViewed(userId: number, sessionId: number, questionId: number) {
    const [sessions]: any = await pool.query(
      "SELECT user_id FROM test_sessions WHERE id = ?",
      [sessionId]
    );
    if (sessions.length === 0) {
      throw new Error("Test session not found");
    }
    if (sessions[0].user_id !== userId) {
      throw new Error("Unauthorized access to this test session");
    }

    await pool.query(
      "UPDATE test_session_questions SET is_viewed = TRUE WHERE session_id = ? AND question_id = ?",
      [sessionId, questionId]
    );

    return { success: true };
  },


  async submitAnswer(userId: number, sessionId: number, questionId: number, answer: any) {
    // Fetch session details and user status in one query to prevent connection pooling and database hammering
    const [sessions]: any = await pool.query(
      `SELECT s.*, u.status as user_status 
       FROM test_sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`,
      [sessionId]
    );
    if (sessions.length === 0) {
      throw new Error("Test session not found");
    }

    const session = sessions[0];

    // Check ownership
    if (session.user_id !== userId) {
      throw new Error("Unauthorized access to this test session");
    }

    // Check ban status
    if (session.user_status === 'banned') {
      throw new Error("Access denied: Your account has been suspended by the administrator.");
    }

    // Check status
    if (session.status !== 'in_progress') {
      throw new Error("This test session is already completed or abandoned");
    }

    // Check expiration
    const now = Date.now();
    const expiresAt = new Date(session.server_expires_at).getTime();
    if (now > expiresAt) {
      // Lazy auto-submit
      await this.submitSession(userId, sessionId);
      throw new Error("Test session time has expired. Your answers have been submitted.");
    }

    // Check if the question is part of this session
    const [sessionQuestions]: any = await pool.query(
      "SELECT id FROM test_session_questions WHERE session_id = ? AND question_id = ?",
      [sessionId, questionId]
    );
    if (sessionQuestions.length === 0) {
      throw new Error("Question is not part of this test session");
    }

    // Stringify answer for database
    const answerJson = JSON.stringify(answer);

    // Upsert answer
    await pool.query(
      `INSERT INTO test_session_answers (session_id, question_id, user_answer, answered_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE user_answer = ?, answered_at = CURRENT_TIMESTAMP`,
      [sessionId, questionId, answerJson, answerJson]
    );

    return { message: "Answer saved successfully" };
  },


  // Helper to submit and grade a test session inside an existing connection/transaction
  async submitSessionInternal(connection: any, userId: number, sessionId: number) {
    const [sessions]: any = await connection.query(
      "SELECT * FROM test_sessions WHERE id = ?",
      [sessionId]
    );
    if (sessions.length === 0) {
      throw new Error("Test session not found");
    }

    const session = sessions[0];

    if (session.user_id !== userId) {
      throw new Error("Unauthorized access to this test session");
    }

    if (session.status === 'completed') {
      return { message: "Session already submitted", session_id: sessionId };
    }

    const [questions]: any = await connection.query(
      `SELECT sq.question_id, sq.marks, q.correct_answer, q.grading_config, q.question_type
       FROM test_session_questions sq
       JOIN questions q ON sq.question_id = q.id
       WHERE sq.session_id = ?`,
      [sessionId]
    );

    const [userAnswers]: any = await connection.query(
      "SELECT * FROM test_session_answers WHERE session_id = ?",
      [sessionId]
    );

    const answerMap = new Map();
    for (const ans of userAnswers) {
      answerMap.set(ans.question_id, ans);
    }

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let totalScore = 0;
    let totalMarks = 0;
    const bulkAnswersPayload: any[] = [];

    for (const q of questions) {
      const qMarks = Number(q.marks || 1.0);
      totalMarks += qMarks;

      const userAnsRow = answerMap.get(q.question_id);

      if (!userAnsRow || userAnsRow.user_answer === null || userAnsRow.user_answer === undefined) {
        skippedCount++;
      } else {
        const answerJson = JSON.stringify(userAnsRow.user_answer);
        const answeredAt = userAnsRow.answered_at;
        const parsedUserAnswer = safeJsonParse(userAnsRow.user_answer);

        const isEmpty = parsedUserAnswer === null ||
          parsedUserAnswer === undefined ||
          (typeof parsedUserAnswer === 'object' && Object.keys(parsedUserAnswer).length === 0) ||
          (typeof parsedUserAnswer === 'string' && parsedUserAnswer.trim() === '');

        if (isEmpty) {
          skippedCount++;
          bulkAnswersPayload.push([
            sessionId,
            q.question_id,
            answerJson,
            false,
            0,
            answeredAt
          ]);
        } else {
          const isCorrect = gradeQuestionAnswer(q, parsedUserAnswer);
          const marksAwarded = isCorrect ? qMarks : 0;

          if (isCorrect) {
            correctCount++;
            totalScore += qMarks;
          } else {
            wrongCount++;
          }

          bulkAnswersPayload.push([
            sessionId,
            q.question_id,
            answerJson,
            isCorrect,
            marksAwarded,
            answeredAt
          ]);
        }
      }
    }

    if (bulkAnswersPayload.length > 0) {
      await connection.query(
        `INSERT INTO test_session_answers 
          (session_id, question_id, user_answer, is_correct, marks_awarded, answered_at)
         VALUES ?
         ON DUPLICATE KEY UPDATE 
          is_correct = VALUES(is_correct), 
          marks_awarded = VALUES(marks_awarded)`,
        [bulkAnswersPayload]
      );
    }

    await connection.query(
      `UPDATE test_sessions
       SET status = 'completed', submitted_at = CURRENT_TIMESTAMP, score = ?, total_marks = ?, correct_count = ?, wrong_count = ?, skipped_count = ?
       WHERE id = ?`,
      [totalScore, totalMarks, correctCount, wrongCount, skippedCount, sessionId]
    );

    return {
      message: "Test submitted and graded successfully",
      session_id: sessionId,
      score: totalScore,
      total_marks: totalMarks,
      correct_count: correctCount,
      wrong_count: wrongCount,
      skipped_count: skippedCount
    };
  },

  async submitSession(userId: number, sessionId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Acquire exclusive row-level lock on test session
      const [sessions]: any = await connection.query(
        "SELECT id FROM test_sessions WHERE id = ? FOR UPDATE",
        [sessionId]
      );
      if (sessions.length === 0) {
        throw new Error("Test session not found");
      }

      const result = await this.submitSessionInternal(connection, userId, sessionId);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // 4. Get session detailed breakdown (only for completed session owned by user)
  // ??$$$
  async getSessionDetail(userId: number, sessionId: number, isAdmin: boolean = false) {
    // Lazy check auto-submit first if it was in_progress but expired
    const [preCheckSessions]: any = await pool.query("SELECT * FROM test_sessions WHERE id = ?", [sessionId]);
    if (preCheckSessions.length > 0) {
      const s = preCheckSessions[0];
      if (s.status === 'in_progress' && Date.now() > new Date(s.server_expires_at).getTime()) {
        try {
          await this.submitSession(s.user_id, s.id);
        } catch (e) {
          console.error("Auto-submit during getSessionDetail failed:", e);
        }
      }
    }

    // Now query session
    const [sessions]: any = await pool.query("SELECT * FROM test_sessions WHERE id = ?", [sessionId]);
    if (sessions.length === 0) {
      throw new Error("Test session not found");
    }

    const session = sessions[0];

    // Check ownership
    // ??$$$
    if (session.user_id !== userId && !isAdmin) {
      throw new Error("Unauthorized access to this test session");
    }

    // Check completion status
    if (session.status !== 'completed') {
      throw new Error("This test session is still in progress");
    }

    // Fetch questions and answers
    const [rows]: any = await pool.query(
      `SELECT 
        q.id as question_id,
        q.category,
        q.subcategory,
        q.difficulty,
        q.question_type,
        q.question_text,
        q.passage,
        q.data_block,
        q.options,
        q.correct_answer,
        q.solution,
        sq.marks,
        sa.user_answer,
        sa.is_correct,
        sa.marks_awarded,
        sa.answered_at
       FROM test_session_questions sq
       JOIN questions q ON sq.question_id = q.id
       LEFT JOIN test_session_answers sa ON sa.session_id = sq.session_id AND sa.question_id = sq.question_id
       WHERE sq.session_id = ?
       ORDER BY sq.question_order ASC`,
      [sessionId]
    );

    const questions = rows.map((r: any) => ({
      id: r.question_id,
      category: r.category,
      subcategory: r.subcategory,
      difficulty: r.difficulty,
      question_type: r.question_type,
      question_text: r.question_text,
      passage: r.passage,
      data_block: safeJsonParse(r.data_block),
      options: safeJsonParse(r.options),
      correct_answer: safeJsonParse(r.correct_answer),
      solution: r.solution,
      marks: r.marks,
      user_answer: safeJsonParse(r.user_answer),
      is_correct: r.is_correct === null ? null : !!r.is_correct,
      marks_awarded: r.marks_awarded === null ? 0 : Number(r.marks_awarded),
      answered_at: r.answered_at
    }));

    return {
      session,
      questions
    };
  },

  // 5. Get list of user's past sessions
  async getHistory(userId: number) {
    // Lazy check: find expired sessions for this user and auto submit them
    const [expiredSessions]: any = await pool.query(
      "SELECT id FROM test_sessions WHERE user_id = ? AND status = 'in_progress' AND server_expires_at < NOW()",
      [userId]
    );

    for (const s of expiredSessions) {
      try {
        await this.submitSession(userId, s.id);
      } catch (e) {
        console.error("Auto submit on history load failed for session:", s.id, e);
      }
    }

    const [history]: any = await pool.query(
      `SELECT id, category, subcategory, difficulty, total_questions, duration_seconds, started_at, submitted_at, status, is_reattempt, original_session_id, score, total_marks, correct_count, wrong_count, skipped_count
       FROM test_sessions
       WHERE user_id = ?
       ORDER BY started_at DESC`,
      [userId]
    );

    return history;
  },

  // 6. Create a reattempt session from a completed one
  async reattemptSession(userId: number, originalSessionId: number) {
    // Fetch original session
    const [originalSessions]: any = await pool.query(
      "SELECT * FROM test_sessions WHERE id = ? AND user_id = ?",
      [originalSessionId, userId]
    );

    if (originalSessions.length === 0) {
      throw new Error("Original test session not found or access denied");
    }

    const orig = originalSessions[0];

    if (orig.status !== 'completed') {
      throw new Error("Only completed sessions can be reattempted");
    }

    // Determine the root session ID if this is a chain of reattempts
    const rootSessionId = orig.original_session_id || orig.id;

    // Create a new session
    const serverExpiresAt = new Date(Date.now() + orig.duration_seconds * 1000);
    const [newSessionResult]: any = await pool.query(
      `INSERT INTO test_sessions (user_id, category, subcategory, difficulty, total_questions, duration_seconds, server_expires_at, is_reattempt, original_session_id, counts_for_stats)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, orig.category, orig.subcategory, orig.difficulty, orig.total_questions, orig.duration_seconds, serverExpiresAt, true, rootSessionId, false]
    );

    const newSessionId = newSessionResult.insertId;

    // Clone questions (same order, same marks) from original session
    const [origQuestions]: any = await pool.query(
      "SELECT question_id, question_order, marks FROM test_session_questions WHERE session_id = ? ORDER BY question_order ASC",
      [originalSessionId]
    );

    /* old code
    for (const q of origQuestions) {
      await pool.query(
        `INSERT INTO test_session_questions (session_id, question_id, question_order, marks)
         VALUES (?, ?, ?, ?)`,
        [newSessionId, q.question_id, q.question_order, q.marks]
      );
    }
    */

    // ??$$$
    if (origQuestions.length > 0) {
      const snapshotValues = origQuestions.map((q: any) => [
        newSessionId,
        q.question_id,
        q.question_order,
        q.marks
      ]);
      await pool.query(
        "INSERT INTO test_session_questions (session_id, question_id, question_order, marks) VALUES ?",
        [snapshotValues]
      );
    }

    // Fetch cloned questions details (excluding correct answers/solutions) to return to client
    const [questions]: any = await pool.query(
      `SELECT q.id, q.category, q.subcategory, q.difficulty, q.question_type, q.question_text, q.passage, q.data_block, q.options
       FROM test_session_questions sq
       JOIN questions q ON sq.question_id = q.id
       WHERE sq.session_id = ?
       ORDER BY sq.question_order ASC`,
      [newSessionId]
    );

    return {
      session_id: newSessionId,
      server_expires_at: serverExpiresAt,
      questions: questions.map((q: any) => ({
        id: q.id,
        category: q.category,
        subcategory: q.subcategory,
        difficulty: q.difficulty,
        question_type: q.question_type,
        question_text: q.question_text,
        passage: q.passage,
        data_block: safeJsonParse(q.data_block),
        options: safeJsonParse(q.options),
      }))
    };
  },
  // 7. Get user leaderboard (filtering by 4 test types: easy_30, easy_60, hard_30, hard_60)


  // ??$$$
  // Ranks students based on the accuracy ratio (correct_count / total_questions) of their best individual test of the type,
  // with cumulative average time per correct question over all completed tests of the type as the tie-breaker.
  async getLeaderboard(type?: string) {
    let diffCondition = "counts_for_stats = TRUE";

    if (type === 'easy_30') {
      diffCondition += " AND (difficulty = 'basic' OR difficulty = 'easy') AND duration_seconds = 1800";
    } else if (type === 'easy_60') {
      diffCondition += " AND (difficulty = 'basic' OR difficulty = 'easy') AND duration_seconds = 3600";
    } else if (type === 'hard_30') {
      diffCondition += " AND (difficulty IN ('intermediate', 'advanced', 'hard')) AND duration_seconds = 1800";
    } else if (type === 'hard_60') {
      diffCondition += " AND (difficulty IN ('intermediate', 'advanced', 'hard')) AND duration_seconds = 3600";
    }

    const query = `
      WITH user_best_test AS (
        SELECT 
          user_id,
          score,
          correct_count,
          total_questions,
          COALESCE(correct_count / NULLIF(total_questions, 0), 0) as accuracy,
          ROW_NUMBER() OVER (
            PARTITION BY user_id 
            ORDER BY 
              COALESCE(correct_count / NULLIF(total_questions, 0), 0) DESC, 
              (UNIX_TIMESTAMP(submitted_at) - UNIX_TIMESTAMP(started_at)) ASC
          ) as rn
        FROM test_sessions
        WHERE status = 'completed' AND ${diffCondition}
      ),
      user_cumulative_stats AS (
        SELECT 
          user_id,
          SUM(UNIX_TIMESTAMP(submitted_at) - UNIX_TIMESTAMP(started_at)) as total_time_seconds,
          SUM(correct_count) as total_correct_count
        FROM test_sessions
        WHERE status = 'completed' AND ${diffCondition}
        GROUP BY user_id
      )
      SELECT 
        ub.user_id,
        u.name,
        ub.score as total_score,
        ub.correct_count,
        ub.total_questions,
        uc.total_time_seconds,
        COALESCE(uc.total_time_seconds / NULLIF(uc.total_correct_count, 0), 0) as time_per_correct,
        RANK() OVER (
          ORDER BY 
            ub.accuracy DESC, 
            COALESCE(uc.total_time_seconds / NULLIF(uc.total_correct_count, 0), 999999) ASC
        ) as rnk
      FROM user_best_test ub
      JOIN user_cumulative_stats uc ON ub.user_id = uc.user_id
      JOIN users u ON ub.user_id = u.id
      WHERE ub.rn = 1
      ORDER BY rnk ASC;
    `;

    const [rows]: any = await pool.query(query);
    return rows;
  },


  // 8. Auto-submit safety net (global check for expired sessions using SKIP LOCKED for multi-pod scalability)
  async autoSubmitExpiredSessions() {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Claim up to 10 expired sessions using SKIP LOCKED to avoid resource contention between node instances
      const [expired]: any = await connection.query(
        `SELECT id, user_id FROM test_sessions 
         WHERE status = 'in_progress' AND server_expires_at < NOW() 
         LIMIT 10 
         FOR UPDATE SKIP LOCKED`
      );

      let submitted = 0;
      for (const s of expired) {
        try {
          await this.submitSessionInternal(connection, s.user_id, s.id);
          submitted++;
        } catch (err) {
          console.error(`Failed to auto-submit session ${s.id}:`, err);
        }
      }

      await connection.commit();

      if (submitted > 0) {
        console.log(`Auto-submit safety net: submitted and graded ${submitted} expired test sessions.`);
      }
    } catch (error) {
      await connection.rollback();
      console.error("Error in autoSubmitExpiredSessions:", error);
    } finally {
      connection.release();
    }
  }
};
