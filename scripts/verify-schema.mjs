import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const checks = [
  {
    schema: "schemas/workflow-intake.schema.json",
    examples: [
      "examples/lecture-intake.json",
      "examples/student-intake.json",
      "examples/assignment-redesign-intake.json",
    ],
  },
  {
    schema: "validation/professor-pilot-record.schema.json",
    examples: [
      "validation/professor-pilot-record.template.json",
      "validation/professor-pilot-record.example.json",
    ],
  },
];

let failed = false;
for (const check of checks) {
  const schema = JSON.parse(fs.readFileSync(check.schema, "utf8"));
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  for (const filename of check.examples) {
    const data = JSON.parse(fs.readFileSync(filename, "utf8"));
    if (!validate(data)) {
      failed = true;
      console.error(`${filename}: invalid`);
      console.error(validate.errors);
    } else {
      console.log(`${filename}: schema-valid`);
    }
  }
}

if (failed) process.exit(1);
