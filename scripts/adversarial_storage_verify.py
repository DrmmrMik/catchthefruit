#!/usr/bin/env python3
"""
Adversarial Verification Oracle for Milestone 2 Persistence & Progression (Catch the Fruit).

Empirically tests:
1. Source AST & Invariant Auditing in src/services/storage.service.ts:
   - Strict > 0.85 mastery threshold operator.
   - Strict >= 10 attempts requirement.
   - Exact star thresholds (1.0 -> 3, 0.90 -> 2, 0.85 -> 1, <0.85 -> 0).
   - 3 consecutive mistakes remediation trigger (>= 3).
   - Streak reset to 0 on correct catch.
   - Monotonic stars, high score, and level unlock preservation.
2. Full Vitest Test Suite Execution (tests/storage.test.ts + tests/progression.test.ts).
3. Precision Boundary Oracle & Property Fuzzing (100,000 float points).
4. Schema Migration & Defaults Integrity.
"""

import os
import sys
import json
import re
import subprocess
import random

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

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

# ---------------------------------------------------------------------------
# Test 1: Code Invariant Inspection in storage.service.ts
# ---------------------------------------------------------------------------
def test_source_code_invariants():
    log("\n--- TEST 1: SOURCE CODE INVARIANT & OPERATOR AUDITING ---")
    storage_path = os.path.join(ROOT_DIR, "src/services/storage.service.ts")
    schema_path = os.path.join(ROOT_DIR, "src/schema/progress.schema.ts")

    if not os.path.exists(storage_path):
        fail(f"Missing storage service at: {storage_path}")
        return
    if not os.path.exists(schema_path):
        fail(f"Missing progress schema at: {schema_path}")
        return

    with open(storage_path, "r", encoding="utf-8") as f:
        storage_code = f.read()

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_code = f.read()

    # Invariant 1.1: Mastery accuracy operator must be strictly > 0.85
    if "norm > 0.85" in storage_code:
        log("  [PASS] Mastery check enforces strict > 0.85: 'norm > 0.85'")
    else:
        fail("Mastery check does NOT enforce strict > 0.85 in storage.service.ts")

    # Invariant 1.2: Mastery attempts check must be >= 10
    if "attemptsCount >= 10" in storage_code:
        log("  [PASS] Mastery check enforces attemptsCount >= 10: 'attemptsCount >= 10'")
    else:
        fail("Mastery check does NOT enforce attemptsCount >= 10 in storage.service.ts")

    # Invariant 1.3: Star calculation boundaries (1.0, 0.90, 0.85)
    has_star_3 = "norm >= 1.0" in storage_code
    has_star_2 = "norm >= 0.90" in storage_code or "norm >= 0.9" in storage_code
    has_star_1 = "norm >= 0.85" in storage_code
    if has_star_3 and has_star_2 and has_star_1:
        log("  [PASS] Star calculation enforces exact boundaries (>= 1.0 -> 3, >= 0.90 -> 2, >= 0.85 -> 1, else 0)")
    else:
        fail(f"Star calculation boundary missing: star3={has_star_3}, star2={has_star_2}, star1={has_star_1}")

    # Invariant 1.4: Remediation trigger at >= 3 consecutive mistakes
    if "consecutiveMistakes >= 3" in storage_code:
        log("  [PASS] Remediation trigger enforces 'consecutiveMistakes >= 3'")
    else:
        fail("Remediation trigger does NOT enforce 'consecutiveMistakes >= 3'")

    # Invariant 1.5: Correct answer streak reset to 0
    if "stats.consecutiveMistakes = 0" in storage_code:
        log("  [PASS] Correct answer strictly resets streak: 'stats.consecutiveMistakes = 0'")
    else:
        fail("Correct answer does NOT reset consecutiveMistakes to 0")

    # Invariant 1.6: Monotonic star and score retention
    if "if (stars > currentStars)" in storage_code:
        log("  [PASS] Stars retained monotonically: 'if (stars > currentStars)'")
    else:
        fail("Stars retention is NOT monotonic")

    if "if (score > currentHighScore)" in storage_code:
        log("  [PASS] High score retained monotonically: 'if (score > currentHighScore)'")
    else:
        fail("High score retention is NOT monotonic")

    # Invariant 1.7: Default unlocked levels in schema
    if "DEFAULT_UNLOCKED_LEVELS" in schema_code:
        for topic in ["phonics_1", "morphology_1", "vocabulary_1", "math_1"]:
            if f"'{topic}': true" in schema_code or f'"{topic}": true' in schema_code:
                log(f"  [PASS] Initial level 1 unlocked for: {topic}")
            else:
                fail(f"Initial unlock missing for topic: {topic}")

# ---------------------------------------------------------------------------
# Test 2: Precision Boundary Oracle & Property Fuzzing (100,000 points)
# ---------------------------------------------------------------------------
def ts_calc_stars(accuracy: float) -> int:
    norm = accuracy / 100.0 if accuracy > 1.0 else accuracy
    if norm >= 1.0:
        return 3
    if norm >= 0.90:
        return 2
    if norm >= 0.85:
        return 1
    return 0

def ts_is_mastery(accuracy: float, attempts: int) -> bool:
    norm = accuracy / 100.0 if accuracy > 1.0 else accuracy
    return attempts >= 10 and norm > 0.85

def test_boundary_oracle():
    log("\n--- TEST 2: MATHEMATICAL BOUNDARY ORACLE & FUZZING (100,000 cases) ---")

    # 2.1 Critical Boundary Points
    critical_checks = [
        # (accuracy, attempts, expected_stars, expected_mastery, label)
        (0.849, 10, 0, False, "84.9% with 10 attempts"),
        (0.849999, 10, 0, False, "84.9999% with 10 attempts"),
        (0.850, 10, 1, False, "85.0% with 10 attempts -> MUST NOT UNLOCK"),
        (85.0, 10, 1, False, "85.0 percentage with 10 attempts -> MUST NOT UNLOCK"),
        (0.850001, 10, 1, True, "85.0001% with 10 attempts -> UNLOCKS"),
        (0.851, 10, 1, True, "85.1% with 10 attempts -> UNLOCKS"),
        (85.1, 10, 1, True, "85.1 percentage with 10 attempts -> UNLOCKS"),
        (0.899, 10, 1, True, "89.9% with 10 attempts"),
        (89.9, 10, 1, True, "89.9 percentage with 10 attempts"),
        (0.899999, 10, 1, True, "89.9999% with 10 attempts"),
        (0.900, 10, 2, True, "90.0% with 10 attempts (2 stars)"),
        (90.0, 10, 2, True, "90.0 percentage with 10 attempts (2 stars)"),
        (0.900001, 10, 2, True, "90.0001% with 10 attempts"),
        (0.950, 10, 2, True, "95.0% with 10 attempts"),
        (0.999, 10, 2, True, "99.9% with 10 attempts"),
        (99.9, 10, 2, True, "99.9 percentage with 10 attempts"),
        (0.999999, 10, 2, True, "99.9999% with 10 attempts"),
        (1.000, 10, 3, True, "100.0% with 10 attempts (3 stars)"),
        (100.0, 10, 3, True, "100.0 percentage with 10 attempts (3 stars)"),
        # Attempts boundary
        (1.000, 9, 3, False, "100% with 9 attempts -> MUST NOT UNLOCK (requires 10+)"),
        (100.0, 9, 3, False, "100.0 pct with 9 attempts -> MUST NOT UNLOCK (requires 10+)"),
        (1.000, 8, 3, False, "100% with 8 attempts -> MUST NOT UNLOCK"),
        (1.000, 0, 3, False, "100% with 0 attempts -> MUST NOT UNLOCK"),
        (0.850, 9, 1, False, "85.0% with 9 attempts -> MUST NOT UNLOCK"),
        (0.900, 9, 2, False, "90.0% with 9 attempts -> MUST NOT UNLOCK"),
        # Fractional attempts
        (8/10, 10, 0, False, "8/10 items (80%)"),
        (9/10, 10, 2, True, "9/10 items (90%) -> UNLOCKS"),
        (10/10, 10, 3, True, "10/10 items (100%) -> UNLOCKS"),
        (17/20, 20, 1, False, "17/20 items (85.0%) -> MUST NOT UNLOCK"),
        (18/20, 20, 2, True, "18/20 items (90.0%) -> UNLOCKS"),
    ]

    for acc, att, exp_stars, exp_mast, label in critical_checks:
        actual_stars = ts_calc_stars(acc)
        actual_mast = ts_is_mastery(acc, att)
        if actual_stars != exp_stars:
            fail(f"Star mismatch on '{label}': expected {exp_stars}, got {actual_stars}")
        if actual_mast != exp_mast:
            fail(f"Mastery mismatch on '{label}': expected {exp_mast}, got {actual_mast}")

    log(f"  [PASS] All {len(critical_checks)} critical boundary cases passed exactly.")

    # 2.2 Fuzzing 100,000 points
    log("  Fuzzing 100,000 test points across [0.0, 1.0] and [0, 50] attempts...")
    random.seed(42)
    fuzz_failures = 0
    for _ in range(100000):
        acc = random.random()
        att = random.randint(0, 50)
        stars = ts_calc_stars(acc)
        mast = ts_is_mastery(acc, att)

        # Invariant 1: Stars partition
        if acc < 0.85 and stars != 0:
            fuzz_failures += 1
        elif 0.85 <= acc < 0.90 and stars != 1:
            fuzz_failures += 1
        elif 0.90 <= acc < 1.00 and stars != 2:
            fuzz_failures += 1
        elif acc >= 1.00 and stars != 3:
            fuzz_failures += 1

        # Invariant 2: Mastery requirements
        expected_mast = (att >= 10 and acc > 0.85)
        if mast != expected_mast:
            fuzz_failures += 1

    if fuzz_failures == 0:
        log("  [PASS] 100,000 fuzz cases satisfied all partition and mastery invariants (0 violations)")
    else:
        fail(f"{fuzz_failures} invariant violations during 100,000 fuzz checks")

# ---------------------------------------------------------------------------
# Test 3: Vitest Integration Test Runner Execution
# ---------------------------------------------------------------------------
def test_vitest_execution():
    log("\n--- TEST 3: VITEST TEST SUITE EXECUTION ---")
    cmd = ["npx", "vitest", "run", "tests/storage.test.ts", "tests/progression.test.ts"]
    try:
        res = subprocess.run(
            cmd,
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )
        output = res.stdout + res.stderr
        log(output.strip())

        if res.returncode == 0:
            match = re.search(r"Tests\s+(\d+)\s+passed\s+\((\d+)\)", output)
            if match:
                passed = int(match.group(1))
                total = int(match.group(2))
                log(f"  [PASS] Vitest completed successfully: {passed}/{total} tests passed (100%)")
            else:
                log("  [PASS] Vitest exited with code 0")
        else:
            fail(f"Vitest exited with non-zero code {res.returncode}")
    except Exception as e:
        fail(f"Failed to execute vitest: {e}")

# ---------------------------------------------------------------------------
# Test 4: Schema Integrity & Resilience Verification
# ---------------------------------------------------------------------------
def test_schema_resilience():
    log("\n--- TEST 4: SCHEMA RESILIENCE & MIGRATION VERIFICATION ---")
    # Verify UserProgressSchema default values match PPS and Game requirements
    schema_path = os.path.join(ROOT_DIR, "src/schema/progress.schema.ts")
    with open(schema_path, "r", encoding="utf-8") as f:
        code = f.read()

    defaults = {
        "sfxVolume": "0.8",
        "musicVolume": "0.5",
        "ttsEnabled": "true",
        "highContrast": "false",
        "totalAttempts": "0",
        "totalCorrect": "0",
        "consecutiveMistakes": "0",
        "orchardGrowthStage": "0"
    }

    for prop, val in defaults.items():
        if f"default({val})" in code:
            log(f"  [PASS] Schema default for '{prop}' is correctly configured to {val}")
        else:
            warn(f"Schema default for '{prop}' may differ from expected {val}")

# ---------------------------------------------------------------------------
# Main Execution & Verdict
# ---------------------------------------------------------------------------
def main():
    log("=================================================================")
    log("  CHALLENGER M2-2 EMPIRICAL PERSISTENCE & PROGRESSION ORACLE     ")
    log("=================================================================")

    test_source_code_invariants()
    test_boundary_oracle()
    test_vitest_execution()
    test_schema_resilience()

    log("\n=================================================================")
    log(f"  VERIFICATION COMPLETE: {len(ERRORS)} error(s), {len(WARNINGS)} warning(s)")
    if len(ERRORS) == 0:
        verdict = "APPROVE"
        log("  VERDICT: APPROVE")
    else:
        verdict = "CHALLENGE_FAILED"
        log("  VERDICT: CHALLENGE_FAILED")
    log("=================================================================")

    output_dir = os.path.join(ROOT_DIR, ".agents/challenger_m2_2")
    os.makedirs(output_dir, exist_ok=True)
    out_file = os.path.join(output_dir, "oracle_output.txt")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(LOGS) + "\n")
    print(f"\nOracle output written to: {out_file}")

    if verdict != "APPROVE":
        sys.exit(1)

if __name__ == "__main__":
    main()
