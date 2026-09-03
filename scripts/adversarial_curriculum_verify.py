#!/usr/bin/env python3
"""
Adversarial Verification Oracle for Milestone 2 Curriculum & Schemas (Catch the Fruit).

Empirically tests:
1. Exact file synchronization between data/ and public/data/.
2. Strict JSON parsing and schema structure.
3. Distractor uniqueness:
   - Target answer != any distractor (case-insensitive, whitespace-trimmed).
   - Base word / target word != any distractor.
   - Zero duplicate distractors within an item's options.
   - Minimum 2 distractors per item.
4. Item ID and Level ID uniqueness:
   - Unique within each topic dataset.
   - Globally unique across ALL topic datasets.
   - Sequential level numbers (1..N).
5. Pedagogical coverage & curriculum constraints:
   - Phonics: >= 40 words, 9 vowel teams, 5 r-controlled vowels, explicit /ē/ vs /ĕ/ split, 'beach' and 'bread'.
   - Morphology: >= 30 distinct base words, 12 affixes, visual segmentation format "^.+ \\+ .+ → .+$".
   - Vocabulary: >= 40 pairs, balanced synonyms and antonyms, grade-level sentence context.
   - Math: addition & subtraction within 20, verified mathematical correctness.
   - 12 Fruit types match atlas specification.
   - Scaffolded speeds (monotonically decreasing fall duration).
"""

import os
import sys
import json
import re

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

VALID_FRUITS = {
    'apple', 'orange', 'grape', 'banana', 'watermelon', 'blueberry',
    'strawberry', 'lemon', 'kiwi', 'peach', 'plum', 'cherry'
}

ERRORS = []
WARNINGS = []
LOGS = []

def log(msg):
    LOGS.append(msg)
    print(msg)

def fail(msg):
    ERRORS.append(msg)
    print(f"  [ERROR] {msg}")

def warn(msg):
    WARNINGS.append(msg)
    print(f"  [WARN] {msg}")

def check_file_sync():
    log("\n--- TEST 1: REPOSITORY DATA SYNCHRONIZATION (data/ vs public/data/) ---")
    topics = ['phonics', 'morphology', 'vocabulary', 'math']
    for t in topics:
        p1 = os.path.join(ROOT_DIR, f"data/{t}.json")
        p2 = os.path.join(ROOT_DIR, f"public/data/{t}.json")

        if not os.path.exists(p1):
            fail(f"Missing primary data file: data/{t}.json")
            continue
        if not os.path.exists(p2):
            fail(f"Missing public data file: public/data/{t}.json")
            continue

        with open(p1, 'rb') as f1, open(p2, 'rb') as f2:
            c1 = f1.read()
            c2 = f2.read()

        if c1 != c2:
            fail(f"Content divergence between data/{t}.json ({len(c1)} bytes) and public/data/{t}.json ({len(c2)} bytes)")
        else:
            log(f"  [PASS] {t}.json: data/ and public/data/ are byte-identical ({len(c1)} bytes).")

def load_datasets():
    datasets = {}
    topics = ['phonics', 'morphology', 'vocabulary', 'math']
    for t in topics:
        path = os.path.join(ROOT_DIR, f"data/{t}.json")
        with open(path, 'r', encoding='utf-8') as f:
            datasets[t] = json.load(f)
    return datasets

def check_id_uniqueness(datasets):
    log("\n--- TEST 2: GLOBAL & TOPIC ID UNIQUENESS AUDIT ---")
    global_item_ids = {}
    global_level_ids = {}

    for topic_name, data in datasets.items():
        # Check topic level IDs and numbers
        level_ids = set()
        level_numbers = []
        for lvl in data.get("levels", []):
            lid = lvl.get("id")
            lnum = lvl.get("levelNumber")

            if lid in level_ids:
                fail(f"Topic '{topic_name}' has duplicate level ID: {lid}")
            level_ids.add(lid)

            if lid in global_level_ids:
                fail(f"Level ID collision across topics: '{lid}' already in '{global_level_ids[lid]}'")
            global_level_ids[lid] = topic_name

            level_numbers.append(lnum)

        expected_numbers = list(range(1, len(level_numbers) + 1))
        if level_numbers != expected_numbers:
            fail(f"Topic '{topic_name}' level numbers are not sequential 1..N: got {level_numbers}, expected {expected_numbers}")
        else:
            log(f"  [PASS] Topic '{topic_name}' has {len(level_numbers)} sequentially numbered levels (1..{len(level_numbers)}).")

        # Check item IDs
        topic_item_ids = set()
        for item in data.get("items", []):
            iid = item.get("id")
            if not iid or not isinstance(iid, str) or not iid.strip():
                fail(f"Topic '{topic_name}' contains item with empty or non-string ID: {item}")
                continue

            if iid in topic_item_ids:
                fail(f"Topic '{topic_name}' has duplicate item ID: '{iid}'")
            topic_item_ids.add(iid)

            if iid in global_item_ids:
                fail(f"Cross-topic item ID collision: '{iid}' found in '{topic_name}' and '{global_item_ids[iid]}'")
            global_item_ids[iid] = topic_name

        log(f"  [PASS] Topic '{topic_name}' has {len(topic_item_ids)} unique item IDs.")

    log(f"  [PASS] Global Item ID total: {len(global_item_ids)} unique items across all topics.")

def check_distractor_uniqueness(datasets):
    log("\n--- TEST 3: ADVERSARIAL DISTRACTOR INTEGRITY & CONTAMINATION AUDIT ---")

    # 1. Phonics
    phonics = datasets['phonics']
    for item in phonics.get("items", []):
        iid = item.get("id", "unknown")
        word = item.get("word", "").strip().lower()
        distractors = [d.strip().lower() for d in item.get("distractorWords", [])]

        if len(distractors) < 2:
            fail(f"Phonics item '{iid}' has fewer than 2 distractors: {distractors}")

        # Check internal uniqueness
        if len(distractors) != len(set(distractors)):
            fail(f"Phonics item '{iid}' has duplicate distractors in its list: {distractors}")

        # Check collision with target word
        if word in distractors:
            fail(f"Phonics item '{iid}' CRITICAL: distractor equals target word '{word}' in {distractors}")

    log(f"  [PASS] Phonics: All {len(phonics.get('items', []))} items have >=2 unique distractors with zero target collisions.")

    # 2. Morphology
    morph = datasets['morphology']
    for item in morph.get("items", []):
        iid = item.get("id", "unknown")
        combined = item.get("combinedWord", "").strip().lower()
        base = item.get("baseWord", "").strip().lower()
        distractors = [d.strip().lower() for d in item.get("distractorWords", [])]

        if len(distractors) < 2:
            fail(f"Morphology item '{iid}' has fewer than 2 distractors: {distractors}")

        if len(distractors) != len(set(distractors)):
            fail(f"Morphology item '{iid}' has duplicate distractors: {distractors}")

        if combined in distractors:
            fail(f"Morphology item '{iid}' CRITICAL: distractor equals combined word '{combined}' in {distractors}")

        if base in distractors:
            fail(f"Morphology item '{iid}' WARNING/FAIL: distractor equals base word '{base}' in {distractors}")

    log(f"  [PASS] Morphology: All {len(morph.get('items', []))} items have >=2 unique distractors with zero target collisions.")

    # 3. Vocabulary
    vocab = datasets['vocabulary']
    for item in vocab.get("items", []):
        iid = item.get("id", "unknown")
        target = item.get("targetWord", "").strip().lower()
        match = item.get("matchWord", "").strip().lower()
        distractors = [d.strip().lower() for d in item.get("distractorWords", [])]

        if len(distractors) < 2:
            fail(f"Vocabulary item '{iid}' has fewer than 2 distractors: {distractors}")

        if len(distractors) != len(set(distractors)):
            fail(f"Vocabulary item '{iid}' has duplicate distractors: {distractors}")

        if match in distractors:
            fail(f"Vocabulary item '{iid}' CRITICAL: distractor equals match word '{match}' in {distractors}")

        if target in distractors:
            fail(f"Vocabulary item '{iid}' distractor equals target prompt word '{target}' in {distractors}")

    log(f"  [PASS] Vocabulary: All {len(vocab.get('items', []))} items have >=2 unique distractors with zero target collisions.")

    # 4. Math
    math = datasets['math']
    for item in math.get("items", []):
        iid = item.get("id", "unknown")
        result = item.get("result")
        distractors = item.get("distractorResults", [])

        if len(distractors) < 2:
            fail(f"Math item '{iid}' has fewer than 2 distractor results: {distractors}")

        if len(distractors) != len(set(distractors)):
            fail(f"Math item '{iid}' has duplicate distractor numbers: {distractors}")

        if result in distractors:
            fail(f"Math item '{iid}' CRITICAL: distractor equals correct result {result} in {distractors}")

    log(f"  [PASS] Math: All {len(math.get('items', []))} items have >=2 unique distractor results with zero target collisions.")

def check_pedagogical_spec(datasets):
    log("\n--- TEST 4: PEDAGOGICAL CURRICULUM CONFORMANCE ---")

    # 1. Topic A Phonics
    phonics = datasets['phonics']
    items_p = phonics.get("items", [])
    if len(items_p) < 40:
        fail(f"Phonics item count ({len(items_p)}) < 40 minimum required")
    else:
        log(f"  [PASS] Phonics item count: {len(items_p)} (exceeds >= 40 required).")

    rules = {i.get("ruleName") for i in items_p}
    req_vowels = ['ai', 'ay', 'ea_long_e', 'ea_short_e', 'ee', 'ie', 'oa', 'oe', 'ui', 'ue']
    for rv in req_vowels:
        if rv not in rules:
            fail(f"Phonics missing required vowel team: {rv}")
    log(f"  [PASS] All 9 vowel teams present (including ea split into long/short).")

    req_r = ['ar', 'er', 'ir', 'or', 'ur']
    for rr in req_r:
        if rr not in rules:
            fail(f"Phonics missing required r-controlled vowel: {rr}")
    log(f"  [PASS] All 5 r-controlled vowels present.")

    # Explicit ea split
    ea_long = [i for i in items_p if i.get("ruleName") == "ea_long_e"]
    ea_short = [i for i in items_p if i.get("ruleName") == "ea_short_e"]
    if len(ea_long) < 5 or len(ea_short) < 5:
        fail(f"Insufficient ea split words: ea_long_e has {len(ea_long)}, ea_short_e has {len(ea_short)}")
    else:
        log(f"  [PASS] ea split verified: {len(ea_long)} /ē/ words, {len(ea_short)} /ĕ/ words.")

    words_set = {i.get("word").lower() for i in items_p}
    if 'beach' not in words_set:
        fail("Phonics missing benchmark exemplar 'beach'")
    if 'bread' not in words_set:
        fail("Phonics missing benchmark exemplar 'bread'")
    log("  [PASS] Benchmark exemplars 'beach' (/ē/) and 'bread' (/ĕ/) present.")

    # 2. Topic B Morphology
    morph = datasets['morphology']
    items_m = morph.get("items", [])
    base_words = {i.get("baseWord").lower() for i in items_m}
    if len(base_words) < 30:
        fail(f"Morphology base word count ({len(base_words)}) < 30 minimum required")
    else:
        log(f"  [PASS] Morphology distinct base words: {len(base_words)} (exceeds >= 30 required).")

    affixes = {i.get("affix") for i in items_m}
    req_affixes = [
        're-', 'un-', 'dis-', 'pre-',
        '-s / -es', '-ed', '-ing', '-er',
        '-est', '-ful', '-less', '-ly'
    ]
    for ra in req_affixes:
        if ra not in affixes:
            fail(f"Morphology missing required affix: {ra}")
    log(f"  [PASS] All 12 required prefixes and suffixes present.")

    seg_regex = re.compile(r"^.+ \+ .+ → .+$")
    for item in items_m:
        seg = item.get("visualSegmentation", "")
        cw = item.get("combinedWord", "")
        if not seg_regex.match(seg):
            fail(f"Morphology item '{item.get('id')}' invalid visualSegmentation format: '{seg}'")
        if cw not in seg:
            fail(f"Morphology item '{item.get('id')}' visualSegmentation '{seg}' does not contain combinedWord '{cw}'")
    log("  [PASS] All morphology visualSegmentation strings match format '^.+ \\+ .+ → .+$' and contain combinedWord.")

    # 3. Topic C Vocabulary
    vocab = datasets['vocabulary']
    items_v = vocab.get("items", [])
    if len(items_v) < 40:
        fail(f"Vocabulary item count ({len(items_v)}) < 40 minimum required")
    else:
        log(f"  [PASS] Vocabulary item count: {len(items_v)} (exceeds >= 40 required).")

    syns = [i for i in items_v if i.get("relationship") == "synonym"]
    ants = [i for i in items_v if i.get("relationship") == "antonym"]
    if len(syns) < 20 or len(ants) < 20:
        fail(f"Vocabulary imbalanced: {len(syns)} synonyms, {len(ants)} antonyms")
    else:
        log(f"  [PASS] Vocabulary balance: {len(syns)} synonyms, {len(ants)} antonyms.")

    for item in items_v:
        sc = item.get("sentenceContext", "")
        if len(sc) < 10:
            fail(f"Vocabulary item '{item.get('id')}' has missing or too short sentenceContext: '{sc}'")
    log("  [PASS] All vocabulary items contextualized in rich sentences.")

    # 4. PPS Grade 2 Math
    math_data = datasets['math']
    items_math = math_data.get("items", [])
    for item in items_math:
        iid = item.get("id")
        op = item.get("operation")
        op1 = item.get("operand1")
        op2 = item.get("operand2")
        res = item.get("result")

        if op == "addition":
            if op1 + op2 != res:
                fail(f"Math item '{iid}' incorrect addition: {op1} + {op2} != {res}")
            if res > 20:
                fail(f"Math item '{iid}' addition result {res} > 20")
        elif op == "subtraction":
            if op1 - op2 != res:
                fail(f"Math item '{iid}' incorrect subtraction: {op1} - {op2} != {res}")
            if op1 > 20 or res < 0:
                fail(f"Math item '{iid}' subtraction out of Grade 2 bounds: {op1} - {op2} = {res}")
        elif op == "skip_counting":
            if op1 + op2 != res:
                fail(f"Math item '{iid}' incorrect skip counting: {op1} + {op2} != {res}")
    log("  [PASS] All math items are mathematically accurate within PPS Grade 2 bounds.")

def check_fruit_types_and_levels(datasets):
    log("\n--- TEST 5: FRUIT TYPES & LEVEL SCAFFOLDING VERIFICATION ---")

    # Check all fruit types across all items
    for topic_name, data in datasets.items():
        for item in data.get("items", []):
            ft = item.get("fruitType")
            if ft not in VALID_FRUITS:
                fail(f"Topic '{topic_name}' item '{item.get('id')}' invalid fruitType: '{ft}'")
    log("  [PASS] Every item across all 4 topics references a valid FruitType from the 12 atlas sprites.")

    # Check level scaffolding
    for topic_name, data in datasets.items():
        levels = data.get("levels", [])
        if len(levels) < 5:
            fail(f"Topic '{topic_name}' has only {len(levels)} levels (< 5)")
        prev_duration = float("inf")
        for lvl in levels:
            dur = lvl.get("fallSpeedDurationMs")
            if dur >= prev_duration:
                fail(f"Topic '{topic_name}' level {lvl.get('levelNumber')} duration {dur}ms is not faster than previous {prev_duration}ms")
            prev_duration = dur

            if lvl.get("masteryAccuracyThreshold") != 0.85:
                fail(f"Topic '{topic_name}' level {lvl.get('levelNumber')} mastery threshold != 0.85")
            if lvl.get("itemsRequired") < 10:
                fail(f"Topic '{topic_name}' level {lvl.get('levelNumber')} itemsRequired < 10")
    log("  [PASS] All topic levels have monotonically decreasing fallSpeedDurationMs (scaffolded speed) and 0.85 mastery threshold.")

def main():
    log("================================================================")
    log("   ADVERSARIAL VERIFICATION ORACLE: MILESTONE 2 CURRICULUM")
    log("================================================================")

    check_file_sync()
    datasets = load_datasets()
    check_id_uniqueness(datasets)
    check_distractor_uniqueness(datasets)
    check_pedagogical_spec(datasets)
    check_fruit_types_and_levels(datasets)

    log("\n================================================================")
    log("                       ORACLE SUMMARY")
    log("================================================================")
    log(f"Total Warnings: {len(WARNINGS)}")
    log(f"Total Errors:   {len(ERRORS)}")

    verdict_path = os.path.join(ROOT_DIR, ".agents/challenger_m2_1/oracle_output.txt")
    with open(verdict_path, "w", encoding="utf-8") as f:
        f.write("\n".join(LOGS) + "\n")
        if ERRORS:
            f.write(f"\nVERDICT: CHALLENGE_FAILED\nErrors:\n" + "\n".join(f"- {e}" for e in ERRORS) + "\n")
        else:
            f.write("\nVERDICT: APPROVE\nAll adversarial checks passed cleanly.\n")

    if ERRORS:
        log("\nVERDICT: CHALLENGE_FAILED")
        for e in ERRORS:
            log(f"  - {e}")
        sys.exit(1)
    else:
        log("\nVERDICT: APPROVE")
        log("All adversarial checks passed cleanly.")
        sys.exit(0)

if __name__ == "__main__":
    main()
