# AptiTest user guide

## Start

Follow the MySQL and Eclipse steps in the root README. Open `http://localhost:8080` after the application has started. Initial administrator and student credentials are listed in the README.

## Student

1. Sign in as a student.
2. Choose a practice template and optional categories. Enable previously viewed questions if you want to repeat a used pool.
3. Start the test. Answers save automatically; wait for the saved indicator before leaving.
4. Navigate between questions and mark items for review.
5. Submit to see correct, incorrect and skipped totals, explanations and score.
6. Use history, solved questions, topic statistics and rankings to review progress.
7. Reattempts are revision sessions and do not inflate rankings.

Four initial templates are free. A paid template can be unlocked only when online payments are configured and verified.

## Administrator

- **Question bank:** search/filter questions, create/edit content, approve or reject pending rows, and import JSON.
- **Templates:** configure question counts, categories, difficulty and duration; archive unused templates.
- **Students:** review results/statistics and enable/disable accounts.
- **Email outbox:** when outbox delivery is enabled, open account verification and recovery messages. This page is restricted to administrators.

Question imports are atomic: an invalid row rejects the entire upload. Use the example file at `src/main/resources/static/examples/questions.json`. Imported questions remain pending until reviewed.

## Registration and recovery

A registration creates a student account. With external email configured, the user verifies the emailed link. With outbox delivery, the administrator opens the verification link from Email outbox. Password-recovery links expire after 30 minutes and work only once. Password changes and account disabling revoke old sessions.

## Submission

```bash
./mvnw clean verify
python3 scripts/package_submission.py
```

Submit the source ZIP and the executable WAR if requested. Do not include your private database password, database dump, dependencies or editor metadata.
