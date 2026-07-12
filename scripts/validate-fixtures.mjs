// Validates the Hermes compliance test fixtures in docs/tests.
//
//   bun scripts/validate-fixtures.mjs
//
// Checks, in order of what actually breaks a test run:
//
//   1. ORACLE LEAKAGE — an *.input.json must never carry expected_outcome (or any
//      other answer-shaped key). The agent reads inputs; if the answer rides along
//      in the same file, the scenario stops testing anything.
//   2. Manifest resolves — every scenario in index.json points at files that exist,
//      and every file on disk is listed in index.json (no orphans).
//   3. Wire-format completeness — the fields docs/tests/marketing-compliance-agent.md
//      calls mandatory are present on packs, requirements, runtime context, and
//      practice records. MCA-T05 deliberately omits runtime_context.audience_location
//      and MCA-T11 deliberately mismatches a regulation_id; both are allowlisted.
//   4. Referential integrity — every practice_id used by a scenario, and every
//      practice_id named by an oracle, exists in company-current-compliance-status.json.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Override with HERMES_FIXTURES_DIR to validate a copy of the corpus (used to
// self-test the leak detector below against a deliberately poisoned fixture).
const TESTS =
  process.env.HERMES_FIXTURES_DIR ?? new URL("../docs/tests/", import.meta.url).pathname;

const read = (p) => JSON.parse(readFileSync(join(TESTS, p), "utf8"));

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

// Answer-shaped keys. If any of these appear in an input bundle, the oracle leaked.
const ORACLE_KEYS = [
  "expected_outcome",
  "expected",
  "assessment_status",
  "applicability_status",
  "decision_required",
  "minimum_confidence",
  "maximum_confidence_exclusive",
  "must_preserve",
  "must_not_do",
  "risk",
];

// Scenarios whose fixture is *intentionally* incomplete or malformed — that IS the test.
const DELIBERATE_DEFECTS = {
  "MCA-T05": ["runtime_context.audience_location"], // absent audience location → unknown applicability
  "MCA-T11": ["pack.regulation_id_mismatch"], // requirement regulation_id ≠ pack regulation_id
};

const PACK_FIELDS = ["pack_version", "regulation_id", "regulation_name", "requirements"];
const REQUIREMENT_FIELDS = [
  "requirement_id",
  "regulation_id",
  "regulation_name",
  "jurisdiction",
  "effective_from",
  "title",
  "description",
  "source_citation",
  "topic",
  "obligation_type",
  "applicability_conditions",
  "likely_departments",
  "priority",
];
const RUNTIME_FIELDS = [
  "organisation",
  "legal_entity",
  "entity_type",
  "business_unit",
  "workflow_id",
  "campaign_id",
  "audience_location",
  "product",
  "sector",
  "channel",
  "assessment_date",
  "run_id",
  "task_id",
  "audience",
];
const PRACTICE_FIELDS = [
  "practice_id",
  "business_entity",
  "operating_jurisdictions",
  "audience_locations",
  "channel",
  "purpose",
  "data_collected",
  "collection_source",
  "lawful_basis",
  "consent_method",
  "consent_evidence",
  "processors",
  "retention",
  "opt_out_process",
  "owner",
  "last_verified_at",
];

/** Recursively hunt for answer-shaped keys anywhere in an input bundle. */
function scanForOracle(node, file, path = "") {
  if (Array.isArray(node)) {
    node.forEach((child, i) => scanForOracle(child, file, `${path}[${i}]`));
    return;
  }
  if (node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    const here = path ? `${path}.${key}` : key;
    // `risk` and `priority` are legitimate requirement metadata; only flag answer keys
    // at a level where they'd constitute a verdict (i.e. anywhere outside requirements).
    const insideRequirement = path.includes("requirements[");
    if (ORACLE_KEYS.includes(key) && !(insideRequirement && key === "risk")) {
      fail(file, `ORACLE LEAK — input bundle contains answer-shaped key \`${here}\``);
    }
    scanForOracle(value, file, here);
  }
}

const manifest = read("index.json");
const company = read("company-current-compliance-status.json");
const knownPractices = new Set(company.practice_records.map((p) => p.practice_id));

const listed = new Set();

for (const entry of manifest.scenarios) {
  const file = entry.input;
  listed.add(file.replace(/^scenarios\//, ""));

  let bundle;
  try {
    bundle = read(file);
  } catch (e) {
    fail(file, `unreadable or invalid JSON (${e.message})`);
    continue;
  }

  const defects = DELIBERATE_DEFECTS[entry.test_id] ?? [];

  // 1. Oracle leakage.
  scanForOracle(bundle, file);

  // 2. Manifest agreement.
  if (bundle.scenario_id !== entry.test_id) {
    fail(file, `scenario_id "${bundle.scenario_id}" ≠ manifest test_id "${entry.test_id}"`);
  }

  // 3. Wire-format completeness.
  if (!Array.isArray(bundle.requirement_packs) || bundle.requirement_packs.length === 0) {
    fail(file, "no requirement_packs");
  }
  for (const pack of bundle.requirement_packs ?? []) {
    for (const f of PACK_FIELDS) {
      if (!(f in pack)) fail(file, `pack ${pack.regulation_id ?? "?"} missing \`${f}\``);
    }
    for (const req of pack.requirements ?? []) {
      for (const f of REQUIREMENT_FIELDS) {
        if (!(f in req)) fail(file, `requirement ${req.requirement_id ?? "?"} missing \`${f}\``);
      }
      // The pack/requirement regulation_id must agree — except in MCA-T11, where the
      // disagreement is the thing under test.
      const mismatchIsTheTest = defects.includes("pack.regulation_id_mismatch");
      if (req.regulation_id !== pack.regulation_id && !mismatchIsTheTest) {
        fail(
          file,
          `requirement ${req.requirement_id} declares regulation_id "${req.regulation_id}" but its pack declares "${pack.regulation_id}"`,
        );
      }
      if (req.regulation_id === pack.regulation_id && mismatchIsTheTest) {
        fail(
          file,
          "MCA-T11 must contain a pack/requirement regulation_id mismatch, but they agree",
        );
      }
    }
  }

  const rt = bundle.runtime_context ?? {};
  for (const f of RUNTIME_FIELDS) {
    if (f in rt) continue;
    if (defects.includes(`runtime_context.${f}`)) continue; // deliberately absent
    fail(file, `runtime_context missing \`${f}\``);
  }
  // The deliberate omission must actually be omitted.
  for (const defect of defects) {
    const [scope, field] = defect.split(".");
    if (scope === "runtime_context" && field in rt) {
      fail(file, `runtime_context.${field} must be ABSENT for ${entry.test_id} — that is the test`);
    }
  }

  if (!Array.isArray(bundle.practice_records) || bundle.practice_records.length === 0) {
    fail(file, "no practice_records");
  }
  for (const practice of bundle.practice_records ?? []) {
    for (const f of PRACTICE_FIELDS) {
      if (!(f in practice)) {
        fail(file, `practice ${practice.practice_id ?? "?"} missing \`${f}\``);
      }
    }
    // 4. Referential integrity against the company snapshot.
    if (!knownPractices.has(practice.practice_id)) {
      fail(
        file,
        `practice_id "${practice.practice_id}" is not in company-current-compliance-status.json`,
      );
    }
  }

  if (!Array.isArray(bundle.requested_outputs) || bundle.requested_outputs.length === 0) {
    fail(file, "no requested_outputs");
  }

  // The oracle is resolved BY CONVENTION, not from the manifest: the manifest is
  // agent-readable, so it must never carry a pointer to the answers.
  const oraclePath = `oracles/${file
    .replace(/^scenarios\//, "")
    .replace(/\.input\.json$/, ".oracle.json")}`;

  let oracle;
  try {
    oracle = read(oraclePath);
  } catch (e) {
    fail(oraclePath, `unreadable or invalid JSON (${e.message})`);
  }
  if (oracle) {
    if (oracle.test_id !== entry.test_id) {
      fail(oraclePath, `test_id "${oracle.test_id}" ≠ manifest test_id "${entry.test_id}"`);
    }
    if (!oracle.expected_outcome && !oracle.expected_records) {
      fail(oraclePath, "oracle has neither `expected_outcome` nor `expected_records`");
    }
    const named = JSON.stringify(oracle).match(/MKT-[A-Z0-9-]+/g) ?? [];
    for (const id of new Set(named)) {
      if (!knownPractices.has(id)) {
        fail(oraclePath, `names practice_id "${id}", which is not in the company snapshot`);
      }
    }
  }
}

// The manifest itself must not leak the answers or point at them.
const manifestText = JSON.stringify(manifest.scenarios);
for (const key of ORACLE_KEYS) {
  if (manifestText.includes(`"${key}"`)) {
    fail("index.json", `scenario entries contain answer-shaped key \`${key}\``);
  }
}
if (manifestText.includes("oracle")) {
  fail("index.json", "scenario entries point at oracle files — the agent reads this manifest");
}

// 2b. No orphan scenario files.
for (const f of readdirSync(join(TESTS, "scenarios"))) {
  if (f.endsWith(".input.json") && !listed.has(f)) {
    fail(`scenarios/${f}`, "exists on disk but is not listed in index.json");
  }
  // An oracle must never sit in scenarios/ — that is the directory the agent reads.
  if (f.includes("oracle")) {
    fail(`scenarios/${f}`, "oracle file must live in oracles/, not scenarios/");
  }
}

// 1b. DIRECTORY-WIDE LEAK SWEEP.
//
// The scan above only sees files the manifest lists, so a stray bundle sitting in
// docs/tests/ with its answers inline would sail past it — while still being readable
// by any agent that globs the directory rather than walking the manifest. The guarantee
// we actually want is a property of the DIRECTORY, not of the manifest: outside
// oracles/, nothing here may carry an expected outcome. So sweep everything.
for (const dirent of readdirSync(TESTS, { recursive: true, withFileTypes: true })) {
  if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;

  const dir = (dirent.parentPath ?? dirent.path).replace(TESTS.replace(/\/$/, ""), "");
  const rel = join(dir, dirent.name).replace(/^\//, "");
  if (rel.startsWith("oracles/")) continue; // the answer key is supposed to live here

  let doc;
  try {
    doc = read(rel);
  } catch {
    continue; // malformed JSON is reported by the per-scenario pass
  }
  scanForOracle(doc, rel);
}

const scenarioCount = manifest.scenarios.length;
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s) across ${scenarioCount} scenario(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ ${scenarioCount} scenarios valid — no oracle leakage, manifest resolves, ` +
    `${knownPractices.size} practice records cross-referenced.`,
);
