# Dispatch: Explorer M2-1 (Phonics & Morphology Curriculum Data & Schemas)

## Identity
- Role: Explorer
- Working Directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_1
- Parent Conversation ID: 92b3a02b-34bd-4ca2-87de-d5628068b2a5

## Mandatory Reading
1. `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`
2. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md`
3. `/home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md`
4. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_1/survey_report.md`

## Milestone 2 Scope: Phonics & Morphology
- Design `src/schema/curriculum.schema.ts` using `zod` for:
  - PhonicsItem (id, pattern, vowelTeam, rControlled, sound, word, sentence, distractorWords, explanation, fruitType)
  - MorphologyItem (id, affixType, affix, baseWord, combinedWord, visualSegmentation, distractorWords, explanation, fruitType)
  - LevelConfig schema and MasterCurriculum schema
- Design the full dataset for:
  - `data/phonics.json`: >= 40 curriculum words across 9 vowel teams (`ai`, `ay`, `ea` [with explicit /ē/ vs /ĕ/ split], `ee`, `ie`, `oa`, `oe`, `ui`, `ue`) and 5 r-controlled (`ar`, `er`, `ir`, `or`, `ur`).
  - `data/morphology.json`: 12 affixes (`re-`, `un-`, `dis-`, `pre-`, `-s`/`-es`, `-ed`, `-ing`, `-er`, `-est`, `-ful`, `-less`, `-ly`) across 30+ base words with `re + play → replay` segmentation.
- Ensure strict zero-hardcoded-curriculum rules (all data in external JSON validated by Zod at startup).

## Output
Write report to `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_1/report.md` and summary in `handoff.md`. Send completion message when done.

## 2026-09-03T01:45:02Z
<USER_REQUEST>
You are Explorer M2-1 for "Catch the Fruit" (Milestone 2: Phonics & Morphology Curriculum Data & Schemas).
Your working directory is: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_1
Your task assignment is in: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_1/DISPATCH.md

MANDATORY: You must read /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md before starting work.
Also read /home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md, SPEC.md, and /home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_1/survey_report.md.

Design the Zod schemas in src/schema/curriculum.schema.ts and the complete external datasets data/phonics.json (vowel teams, r-controlled, ea split, >=40 words) and data/morphology.json (12 affixes, 30+ base words, segmentation).
Write report.md and handoff.md. Send completion message back to parent when done.
</USER_REQUEST>

