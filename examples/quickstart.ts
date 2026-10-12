/** Run: COMPANYDATA_API_KEY=... npx tsx examples/quickstart.ts */
import { CvrClient } from "../src/index";

const client = new CvrClient({ auth: { type: "apiKey", apiKey: process.env.COMPANYDATA_API_KEY! } });

const company = await client.getByCvr("61056416");
console.log("By CVR number:", company);

const page = await client.search({ cityName: "Copenhagen", hasEmail: true, pageSize: 25 });
console.log("Search:", page.data);
