import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source =
  "https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt";
const names = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  AS: "American Samoa",
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  VI: "U.S. Virgin Islands",
};
const response = await fetch(source);
if (!response.ok)
  throw new Error(`CENSUS_COUNTY_DOWNLOAD_FAILED_${response.status}`);
const rows = (await response.text()).trim().split(/\r?\n/).slice(1),
  counties = {};
for (const row of rows) {
  const [state, , , , county] = row.split("|");
  if (!names[state] || !county) continue;
  (counties[state] ??= []).push(county);
}
for (const values of Object.values(counties))
  values.sort((a, b) => a.localeCompare(b));
const states = Object.keys(names)
  .filter((code) => counties[code]?.length)
  .map((code) => ({ code, name: names[code], counties: counties[code] }));
const output = `// Generated from the U.S. Census Bureau 2020 national county code file.\n// Source: ${source}\n// Run: node scripts/update-investor-geography.mjs\nexport const US_GEOGRAPHY=${JSON.stringify(states)};\nexport const US_STATES=US_GEOGRAPHY.map(({code,name})=>({code,name}));\nexport const countiesForState=state=>US_GEOGRAPHY.find(item=>item.code===String(state??'').toUpperCase())?.counties??[];\n`;
const target = resolve("src/investor-crm/us-geography.js");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, output, "utf8");
console.log(
  `Wrote ${states.length} states and ${states.reduce((sum, item) => sum + item.counties.length, 0)} counties to ${target}`,
);
