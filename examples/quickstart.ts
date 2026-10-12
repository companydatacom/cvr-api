/**
 * Live quickstart and smoke test for @companydata/cvr-api.
 *
 * Run:  COMPANYDATA_API_KEY=... npx tsx examples/quickstart.ts
 * Key:  https://app.companydata.com/signup-api (first calls are free)
 *
 * Every call below was verified against the live API. City and province
 * names are matched in UPPER CASE.
 */
import { strict as assert } from "node:assert";
import { CvrClient, ApiError } from "../src/index";

const apiKey = process.env.COMPANYDATA_API_KEY;
if (!apiKey) {
  console.error("Set COMPANYDATA_API_KEY first. Get one at https://app.companydata.com/signup-api");
  process.exit(1);
}

const client = new CvrClient({ auth: { type: "apiKey", apiKey } });

try {
  // 1. Look up one business by its CVR number.
const company = await client.getByCvr("32570119");
console.log("By CVR number:", company?.["Company Name"], "|", company?.["City"], "|", company?.["Company Registration Number"]);
assert(company, "expected Maersk Training A/S for 32570119");

  // 2. Search by name, pinned to a city.
  const byName = await client.search({ search: "Maersk", cityName: "KØBENHAVN", pageSize: 5 });
  console.log(`Search "Maersk" in KØBENHAVN: ${byName.totalCount} matches, first: ${byName.records[0]?.["Company Name"]}`);
  assert(byName.totalCount > 0, "expected search hits");

  // 3. Segment: businesses in a city that have both an email address and a website.
  const segment = await client.search({ cityName: "KØBENHAVN", hasEmail: true, hasWebsite: true, pageSize: 25 });
  console.log(`KØBENHAVN with email + website: ${segment.totalCount} (page ${segment.page} of ${segment.totalPages})`);
  assert(segment.records.length > 0, "expected segment records");

  // 4. Filter on province (admin-2 name, UPPER CASE) and company size.
  const sized = await client.search({ provinceName: "SYDDANMARK", employeesTotal: { min: 50 }, pageSize: 1 });
  console.log(`Syddanmark, 50+ employees: ${sized.totalCount}`);

  // 5. Stream a set with scroll export (3 batches of 10, capped at 25 records).
  //    Export spends one credit per new company, so this is kept small.
  try {
    let pulled = 0;
    let firstEmail: unknown;
    for await (const record of client.iterate({ cityName: "KØBENHAVN", hasEmail: true }, { pageSize: 10, maxRecords: 25 })) {
      firstEmail ??= record["Email"];
      pulled += 1;
    }
    console.log("Streamed records:", pulled, "| first email:", firstEmail ?? "(field not enabled on this key)");
    assert.equal(pulled, 25, "expected 25 streamed records");
  } catch (err) {
    if (err instanceof ApiError && /credit|over limit/i.test(err.message)) {
      console.warn("Export skipped: this key has no export credits left (" + err.message + ")");
    } else {
      throw err;
    }
  }

  console.log("OK");
} catch (err) {
  if (err instanceof ApiError) {
    console.error(`API error ${err.status}: ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
}
