# Dispatch: Explorer M2-2 (Vocabulary & Math Curriculum Data & Schemas)

## Identity
- Role: Explorer
- Working Directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_2
- Parent Conversation ID: 92b3a02b-34bd-4ca2-87de-d5628068b2a5

## Mandatory Reading
1. `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`
2. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md`
3. `/home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md`
4. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_1/survey_report.md`

## Milestone 2 Scope: Vocabulary & Math
- Design `src/schema/curriculum.schema.ts` extensions using `zod` for:
  - VocabularyItem (id, relationship: 'synonym' | 'antonym', targetWord, matchWord, sentenceContext, distractorWords, explanation, fruitType)
  - MathItem (id, operation: 'addition' | 'subtraction' | 'skip_counting', operand1, operand2, result, prompt, distractorResults, explanation, fruitType)
- Design the full dataset for:
  - `data/vocabulary.json`: 40+ synonym and antonym pairs contextualized in 2nd-grade sentences.
  - `data/math.json`: Grade 2 PPS Math items (addition/subtraction within 20, doubles, making 10, skip counting by 2s, 5s, 10s).
- Ensure strict zero-hardcoded-curriculum rules.

## Output
Write report to `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_2/report.md` and summary in `handoff.md`. Send completion message when done.
