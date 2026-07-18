import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(fs.readFileSync("schemas/workflow-intake.schema.json", "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const examples = ["examples/lecture-intake.json", "examples/student-intake.json"];

let failed = false;
for (const filename of examples) {
  const data = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (!validate(data)) {
    failed = true;
    console.error(`${filename}: invalid`);
    console.error(validate.errors);
  } else {
    console.log(`${filename}: schema-valid`);
  }
}

if (failed) process.exit(1);
