/**
 * Integration tests for POST /identify
 * Run: npm test
 * Override URL: BASE_URL=https://your-url.com npm test
 */

const BASE_URL = process.env["BASE_URL"] ?? "https://identity-reconciliation-5caq.onrender.com";

const uid = Date.now(); // unique suffix to isolate each test run

let passed = 0;
let failed = 0;

async function post(body: object): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/identify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

function assert(label: string, condition: boolean, received?: unknown): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`, received !== undefined ? `\n     Got: ${JSON.stringify(received)}` : "");
    failed++;
  }
}

// ------- Test Cases -------

async function testNewContact() {
  console.log("\n[1] New contact — should create a primary");
  const res = await post({ email: `new_${uid}@test.com`, phoneNumber: `${uid}1` });
  const c = (res as any).contact;
  assert("returns contact object", !!c, res);
  assert("has primaryContatctId", typeof c?.primaryContatctId === "number", c);
  assert("emails includes provided email", c?.emails?.includes(`new_${uid}@test.com`), c?.emails);
  assert("phoneNumbers includes provided phone", c?.phoneNumbers?.includes(`${uid}1`), c?.phoneNumbers);
  assert("no secondaries", c?.secondaryContactIds?.length === 0, c?.secondaryContactIds);
  return c?.primaryContatctId as number;
}

async function testNoNewInfo(primaryId: number) {
  console.log("\n[2] Same info again — should return same contact, no new row");
  const res = await post({ email: `new_${uid}@test.com`, phoneNumber: `${uid}1` });
  const c = (res as any).contact;
  assert("same primaryContatctId", c?.primaryContatctId === primaryId, c?.primaryContatctId);
  assert("still no secondaries", c?.secondaryContactIds?.length === 0, c?.secondaryContactIds);
}

async function testNewEmailSamePhone(primaryId: number) {
  console.log("\n[3] Same phone, new email — should create secondary");
  const res = await post({ email: `secondary_${uid}@test.com`, phoneNumber: `${uid}1` });
  const c = (res as any).contact;
  assert("same primary", c?.primaryContatctId === primaryId, c?.primaryContatctId);
  assert("both emails present", c?.emails?.includes(`new_${uid}@test.com`) && c?.emails?.includes(`secondary_${uid}@test.com`), c?.emails);
  assert("primary email is first", c?.emails?.[0] === `new_${uid}@test.com`, c?.emails);
  assert("one secondary created", c?.secondaryContactIds?.length === 1, c?.secondaryContactIds);
}

async function testNewPhoneSameEmail(primaryId: number) {
  console.log("\n[4] Same email, new phone — should create another secondary");
  const res = await post({ email: `new_${uid}@test.com`, phoneNumber: `${uid}2` });
  const c = (res as any).contact;
  assert("same primary", c?.primaryContatctId === primaryId, c?.primaryContatctId);
  assert("new phone in list", c?.phoneNumbers?.includes(`${uid}2`), c?.phoneNumbers);
  assert("two secondaries now", c?.secondaryContactIds?.length === 2, c?.secondaryContactIds);
}

async function testOnlyEmail() {
  console.log("\n[5] Only email provided — should work");
  const res = await post({ email: `only_email_${uid}@test.com` });
  const c = (res as any).contact;
  assert("returns contact", !!c?.primaryContatctId, c);
  assert("email present", c?.emails?.includes(`only_email_${uid}@test.com`), c?.emails);
}

async function testOnlyPhone() {
  console.log("\n[6] Only phone provided — should work");
  const res = await post({ phoneNumber: `${uid}3` });
  const c = (res as any).contact;
  assert("returns contact", !!c?.primaryContatctId, c);
  assert("phone present", c?.phoneNumbers?.includes(`${uid}3`), c?.phoneNumbers);
}

async function testPrimaryMerge() {
  console.log("\n[7] Two separate primaries linked — older should stay primary");
  const uid2 = uid + 9000;

  // Create first primary
  const r1 = await post({ email: `p1_${uid2}@test.com`, phoneNumber: `${uid2}1` });
  const id1 = (r1 as any).contact?.primaryContatctId as number;

  // Create second primary (different email & phone)
  const r2 = await post({ email: `p2_${uid2}@test.com`, phoneNumber: `${uid2}2` });
  const id2 = (r2 as any).contact?.primaryContatctId as number;

  assert("two separate primaries created", id1 !== id2, { id1, id2 });

  // Link them — older (id1) should win
  const r3 = await post({ email: `p1_${uid2}@test.com`, phoneNumber: `${uid2}2` });
  const c = (r3 as any).contact;
  assert("older contact is primary", c?.primaryContatctId === id1, c?.primaryContatctId);
  assert("newer contact is secondary", c?.secondaryContactIds?.includes(id2), c?.secondaryContactIds);
  assert("both emails present", c?.emails?.includes(`p1_${uid2}@test.com`) && c?.emails?.includes(`p2_${uid2}@test.com`), c?.emails);
  assert("both phones present", c?.phoneNumbers?.includes(`${uid2}1`) && c?.phoneNumbers?.includes(`${uid2}2`), c?.phoneNumbers);
}

async function testInvalidBody() {
  console.log("\n[8] No email or phone — should return 400");
  const res = await fetch(`${BASE_URL}/identify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert("returns 400", res.status === 400, res.status);
}

// ------- Runner -------

async function run() {
  console.log(`\nRunning tests against: ${BASE_URL}\n${"─".repeat(50)}`);
  try {
    const primaryId = await testNewContact();
    await testNoNewInfo(primaryId);
    await testNewEmailSamePhone(primaryId);
    await testNewPhoneSameEmail(primaryId);
    await testOnlyEmail();
    await testOnlyPhone();
    await testPrimaryMerge();
    await testInvalidBody();
  } catch (err) {
    console.error("\nUnexpected error:", err);
    failed++;
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
