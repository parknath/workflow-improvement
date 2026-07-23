import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { assessPilotCompleteness, evaluateProfessorPilotCohort, type ProfessorPilotRecord } from "./professorPilot";

const filenames = process.argv.slice(2);
if (filenames.length === 0) {
  console.error("Usage: pnpm pilots:check -- <pilot-record.json> [more-records.json]");
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync("validation/professor-pilot-record.schema.json", "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const records = filenames.map((filename) => {
  const record = JSON.parse(fs.readFileSync(filename, "utf8")) as ProfessorPilotRecord;
  if (!validate(record)) {
    console.error(`${filename}: invalid pilot evidence record`);
    console.error(validate.errors);
    process.exit(1);
  }
  return record;
});
for (const record of records) {
  const result = assessPilotCompleteness(record);
  console.log(`${result.participantCode}: ${result.complete ? "complete" : "incomplete"}`);
  for (const item of result.missing) console.log(`  - ${item}`);
}

const cohort = evaluateProfessorPilotCohort(records);
console.log(`Cohort: ${cohort.recommendation} (${cohort.completePilotCount} complete real pilots; ${cohort.excludedSyntheticCount} synthetic excluded)`);
for (const item of cohort.gates) console.log(`  - ${item.label}: ${item.actual}/${item.required} ${item.passed ? "PASS" : "OPEN"}`);
for (const item of cohort.coverage) {
  const values = item.values.length === 0 ? "none" : item.values.map((value) => `${value.value}=${value.count}`).join(", ");
  console.log(`  - Coverage — ${item.label}: ${values}`);
}
for (const warning of cohort.coverageWarnings) console.log(`  - Coverage warning: ${warning}`);
for (const reason of cohort.reasons) console.log(`  - ${reason}`);
