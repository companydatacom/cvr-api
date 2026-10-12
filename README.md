# Danish CVR register API by CompanyData

[![npm](https://img.shields.io/npm/v/@companydata/cvr-api.svg)](https://www.npmjs.com/package/@companydata/cvr-api)

A small, typed TypeScript wrapper for looking up **Danish company data from the CVR (Central Business Register)**: company names, full street addresses, phone, email, website, size and revenue, through one REST call.

This package is a thin convenience layer over the master [`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk). It is the same API and the same key, with the country pinned to Denmark and a register-specific helper on top, so you can write `client.getByCvr("32570119")` instead of assembling query parameters by hand.

> One schema, one key. Every CompanyData register wrapper returns records in the same shape, so moving from CVR to another country's register is a one-line change.

## At a glance

| | |
| --- | --- |
| Country | 🇩🇰 Denmark (`countryCode: "DK"`) |
| Register | Danish CVR register |
| Businesses in CompanyData | 957K |
| With phone number | 342K |
| With email address | 465K |
| Lookup key | CVR number (8 digits) |
| Verified example | Maersk Training A/S, `32570119` |
| Live demo and comparison | [companydata.com/cvr-api](https://companydata.com/cvr-api/) |
| Official register | [datacvr.virk.dk](https://datacvr.virk.dk) |

Counts are from the live API on 2026-10-12 and grow over time.

## What is the CVR?

The **CVR** (Det Centrale Virksomhedsregister) is the Danish central business register, maintained by the Danish Business Authority and published at [datacvr.virk.dk](https://datacvr.virk.dk). It is the authoritative source for legal form, ownership, production units and filings.

What the official CVR channels do **not** give you: system-to-system access needs an agreement and an Elasticsearch integration, lookups are one company at a time on the website, and contact fields are only there when the company chose to publish them.

**CompanyData adds the missing fields.** 957K Danish businesses with full addresses, phone, email, website, directors and firmographics, filterable and exportable in bulk through one live REST API. Comparison and a live lookup: [companydata.com/cvr-api](https://companydata.com/cvr-api/).

## Installation

```bash
npm install @companydata/cvr-api
```

Get an API key at [app.companydata.com/signup-api](https://app.companydata.com/signup-api). Your first calls are free.

## Quickstart

```ts
import { CvrClient } from "@companydata/cvr-api";

const client = new CvrClient({
  auth: { type: "apiKey", apiKey: process.env.COMPANYDATA_API_KEY! }
});

// Look up one business by its CVR number.
const company = await client.getByCvr("32570119"); // Maersk Training A/S

// Search with filters (country is always DK here).
const page = await client.search({
  cityName: "KØBENHAVN",
  hasEmail: true,
  hasWebsite: true,
  page: 1,
  pageSize: 25
});
console.log(page.totalCount, page.records[0]?.["Company Name"]);
```

> **City and province names are UPPER CASE.** Filter on `cityName: "KØBENHAVN"`, not `"København"` (which returns 0). The same goes for `provinceName: "SYDDANMARK"`. List exact names per country with `GET /api/cities`. Full field and filter reference: [companydata.com/api-docs/request-company](https://companydata.com/api-docs/request-company/).

Run the full example against the live API with your key:

```bash
git clone https://github.com/companydatacom/cvr-api && cd cvr-api && npm install
COMPANYDATA_API_KEY=... npm run test:live
```

## What a record looks like

Every record is a flat object with human-readable keys. This is Maersk Training A/S as returned by `getByCvr`:

```json
{
  "Company Name": "Maersk Training A/S",
  "Trade Name": "Maersk Training Esbjerg A/S",
  "Company Registration Number": "32570119",
  "Address 1": "Dyrekredsen 4",
  "Postal Code": "5700",
  "City": "Svendborg",
  "State/Province": "Syddanmark",
  "Country": "Denmark",
  "Phone Number": "+4*****83",
  "Email": "*****@*****",
  "Website": "maersktraining.*****",
  "Founding Year": 2009,
  "Employees Total": 1617,
  "Yearly Revenue in U.S. Dollars": 13343942,
  "Business Category Code 1 - Description": "Schools and Educational Services, Not Elsewhere Classified",
  "Business Legal Type - Description": "Corporation"
}
```

**Search is a preview, export is the full record.** `search` (and the lookup helper, which uses it) returns about 20 fields with phone, email and website masked as `*****`, and does not spend credits. `export`, `exportWithScroll` and `iterate` return the full record (about 35 fields, unmasked contact details, SIC and national industry codes, legal status, group structure) and spend one credit per company you have not exported before. Which fields are on a record depends on your key's configuration. See the [field reference](https://companydata.com/api-docs/request-company/) and [plans and credits](https://companydata.com/api-docs/authentication/).

## Methods

| Method | Returns | Does |
| --- | --- | --- |
| `client.search(params)` | `CvrPage` | Search Danish businesses with filters. |
| `client.getByCvr(id, scope?)` | `CompanyRecord \| null` | Fetch one business by CVR number. `scope` adds extra filters when a number is not unique. |
| `client.export(params)` | `CvrPage` | Export one page of results (standard pagination). |
| `client.exportWithScroll(params)` | `CvrScrollBatch` | One scroll batch (max 50 records). Pass `scrollId` back in for the next. |
| `client.iterate(params, { maxRecords })` | `AsyncGenerator<CompanyRecord>` | Streams every matching record across scroll batches. |
| `client.raw` | `ApiClient` | The underlying master SDK client, for anything not wrapped here. |
| `normalizeCvrId(id)` | `string` | The CVR number normalisation the lookup helper applies. |

```ts
interface CvrPage {
  records: CompanyRecord[];   // flat objects, keys like "Company Name", "City", "Email"
  totalCount: number;         // matches across all pages
  page: number;
  totalPages: number;
  pageSize: number;
}

interface CvrScrollBatch {
  records: CompanyRecord[];
  scrollId: string | null;    // pass back in to get the next batch
  hasMoreRecords: boolean;
  pageSize: number;
}
```

`params` is the master SDK's filter set with `countryCode` removed, because it is always `"DK"` here. For cross-border queries, use the master SDK directly.

### Lookup by CVR number

`getByCvr` takes the 8-digit CVR number. Spaces are stripped and short numbers are left-padded with zeros, so `"32 57 01 19"` and `"32570119"` match the same company. Production units (P-numre) share the CVR number, so you get the first registered unit.

## Recipes

**Find a company by name, pinned to a city**

```ts
const { records, totalCount } = await client.search({
  search: "Maersk",
  cityName: "KØBENHAVN",
  pageSize: 5
});
```

**Build a segment: companies in a province with 50 or more employees**

```ts
const page = await client.search({
  provinceName: "SYDDANMARK",
  employeesTotal: { min: 50 },
  hasPhone: true,
  pageSize: 100
});
```

**Stream a whole segment with scroll export**

```ts
for await (const company of client.iterate(
  { cityName: "KØBENHAVN", hasEmail: true },
  { maxRecords: 5000 }
)) {
  console.log(company["Company Name"], company["Email"]);
}
```

**Drive the scroll loop yourself**

```ts
let batch = await client.exportWithScroll({ cityName: "KØBENHAVN", hasEmail: true, pageSize: 50 });
while (batch.records.length > 0) {
  process(batch.records);
  if (!batch.hasMoreRecords || !batch.scrollId) break;
  batch = await client.exportWithScroll({ cityName: "KØBENHAVN", hasEmail: true, scrollId: batch.scrollId, pageSize: 50 });
}
```

**Anything else: drop to the master client**

```ts
const res = await client.raw.company.search({ countryCode: "DE", cityName: "BERLIN", pageSize: 10 });
```

### Common filters

| Filter | Example | Notes |
| --- | --- | --- |
| `search` | `"Maersk"` | Free text over company and trade names. |
| `nationalId` | `"32570119"` | Registration number. The lookup helper sets this for you. |
| `cityName` | `"KØBENHAVN"` | UPPER CASE. |
| `provinceName` | `"SYDDANMARK"` | Admin-2 name, UPPER CASE (the record's `State/Province`). |
| `postalCode` | `"5700"` | Exact match. |
| `hasEmail`, `hasPhone`, `hasWebsite` | `true` | Contact availability. |
| `employeesTotal`, `annualSales`, `foundingYears` | `{ min: 50, max: 500 }` | Range filters. |
| `sic4Digits` | `"7372"` | 4-digit SIC industry code. |

Full list: [companydata.com/api-docs/request-company](https://companydata.com/api-docs/request-company/).

## Four ways to integrate

Pick whichever fits how you build. All four hit the same data behind the same key.

1. **This register SDK** (`@companydata/cvr-api`): Danish lookups with a CVR-specific helper. You are here.
2. **Master SDK** ([`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk)): all 200+ countries in one typed client, keyed by `countryCode`.
3. **MCP server**: connect an AI agent (Claude, Cursor and others) to `https://companydata.com/mcp/` with your key in the `x-api-key` header. See [companydata-mcp-server](https://github.com/companydatacom/companydata-mcp-server).
4. **Raw REST**: call `GET https://app.companydata.com/api/company/search?countryCode=DK&cityName=K%C3%98BENHAVN` with an `x-api-key` header. Contract: [companydata.com/openapi.json](https://companydata.com/openapi.json).

```bash
curl -H "x-api-key: $COMPANYDATA_API_KEY" \
  "https://app.companydata.com/api/company/search?countryCode=DK&nationalId=32570119&pageSize=1"
```

## Error handling

Failed requests throw `ApiError` with the HTTP status. The client retries transient failures (429 and 5xx) with backoff before giving up.

```ts
import { ApiError } from "@companydata/cvr-api";

try {
  await client.search({ cityName: "KØBENHAVN" });
} catch (err) {
  if (err instanceof ApiError) {
    // 401: bad or missing key, 429: rate limited,
    // "Export credit limit exceeded" (code credits_limit_exceeded): export credits used up
    console.error(err.status, err.message);
  }
}
```

A scroll batch that is larger than your remaining credits is rejected as a whole, so keep `pageSize` small when a key is close to its limit.

## All register wrappers

Same pattern, one per official register. Every wrapper returns the same record shape.

| Country | Register | Package | Lookup helper |
| --- | --- | --- | --- |
| 🇳🇱 Netherlands | KVK | [`@companydata/kvk-api`](https://github.com/companydatacom/kvk-api) | `getByKvkNumber` |
| 🇩🇪 Germany | Handelsregister | [`@companydata/handelsregister-api`](https://github.com/companydatacom/handelsregister-api) | `getByRegistrationNumber` |
| 🇬🇧 United Kingdom | Companies House | [`@companydata/companies-house-api`](https://github.com/companydatacom/companies-house-api) | `getByCompanyNumber` |
| 🇫🇷 France | Sirene | [`@companydata/sirene-api`](https://github.com/companydatacom/sirene-api) | `getBySiret` |
| 🇧🇪 Belgium | KBO/BCE | [`@companydata/kbo-api`](https://github.com/companydatacom/kbo-api) | `getByEnterpriseNumber` |
| 🇵🇱 Poland | KRS | [`@companydata/krs-api`](https://github.com/companydatacom/krs-api) | `getByNip` |
| 🇸🇪 Sweden | Bolagsverket | [`@companydata/bolagsverket-api`](https://github.com/companydatacom/bolagsverket-api) | `getByOrgNumber` |
| 🇨🇭 Switzerland | Zefix | [`@companydata/zefix-api`](https://github.com/companydatacom/zefix-api) | `getByUid` |
| 🇨🇿 Czech Republic | ARES | [`@companydata/ares-api`](https://github.com/companydatacom/ares-api) | `getByIco` |
| 🇩🇰 Denmark | CVR | [`@companydata/cvr-api`](https://github.com/companydatacom/cvr-api) | `getByCvr` |
| 🇧🇷 Brazil | CNPJ | [`@companydata/cnpj-api`](https://github.com/companydatacom/cnpj-api) | `getByCnpj` |
| 🇦🇺 Australia | ABR | [`@companydata/abn-lookup-api`](https://github.com/companydatacom/abn-lookup-api) | `getByAbn` |
| 🇺🇸 United States | SEC EDGAR | [`@companydata/sec-edgar-api`](https://github.com/companydatacom/sec-edgar-api) | `getByRegistrationNumber` |

Plus the master SDK for every other country: [`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk).

## License

MIT. Built and maintained by [CompanyData.com](https://companydata.com).
