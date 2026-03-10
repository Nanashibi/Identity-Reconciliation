import type { Contact } from "../generated/prisma/client";
import {
  findContactsByEmailOrPhone,
  findAllContactsByPrimaryId,
  createContact,
  convertToSecondary,
  reassignSecondaries,
} from "../repositories/contact.repository";

export interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export async function identifyContact(
  email?: string | null,
  phoneNumber?: string | null
): Promise<IdentifyResponse> {
  // 1. Find all existing contacts matching email OR phone
  const matches = await findContactsByEmailOrPhone(email, phoneNumber);

  // 2. No matches — create a new primary contact
  if (matches.length === 0) {
    const newContact = await createContact({
      email: email ?? null,
      phoneNumber: phoneNumber ?? null,
      linkPrecedence: "primary",
    });
    return buildResponse(newContact.id, [newContact]);
  }

  // 3. Gather all unique primary IDs referenced by the matches
  const primaryIds = new Set<number>();
  for (const contact of matches) {
    if (contact.linkPrecedence === "primary") {
      primaryIds.add(contact.id);
    } else if (contact.linkedId !== null) {
      primaryIds.add(contact.linkedId);
    }
  }

  // 4. If two separate primaries are being linked, merge them
  if (primaryIds.size > 1) {
    // Fetch the actual primary contacts to determine which is oldest
    const primaries = await Promise.all(
      [...primaryIds].map((id) =>
        findAllContactsByPrimaryId(id).then((c) => c[0])
      )
    );
    const defined = primaries.filter((p): p is Contact => p !== undefined);
    defined.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    const [oldestPrimary, ...newPrimaries] = defined;
    if (!oldestPrimary) throw new Error("No primary contact found");

    // Convert newer primaries (and all their secondaries) under the oldest
    for (const newer of newPrimaries) {
      await reassignSecondaries(newer.id, oldestPrimary.id);
      await convertToSecondary(newer.id, oldestPrimary.id);
    }

    const allContacts = await findAllContactsByPrimaryId(oldestPrimary.id);
    return buildResponse(oldestPrimary.id, allContacts);
  }

  // 5. Single primary — check if we need to create a secondary
  const primaryId = [...primaryIds][0];
  if (primaryId === undefined) throw new Error("No primary ID resolved");

  const allContacts = await findAllContactsByPrimaryId(primaryId);

  const emailExists = allContacts.some((c) => c.email === email);
  const phoneExists = allContacts.some((c) => c.phoneNumber === phoneNumber);

  const needsNewSecondary =
    (email && !emailExists) || (phoneNumber && !phoneExists);

  if (needsNewSecondary) {
    await createContact({
      email: email ?? null,
      phoneNumber: phoneNumber ?? null,
      linkedId: primaryId,
      linkPrecedence: "secondary",
    });
    const updated = await findAllContactsByPrimaryId(primaryId);
    return buildResponse(primaryId, updated);
  }

  return buildResponse(primaryId, allContacts);
}

function buildResponse(
  primaryId: number,
  contacts: Contact[]
): IdentifyResponse {
  const primary = contacts.find((c) => c.id === primaryId);
  const secondaries = contacts.filter((c) => c.id !== primaryId);

  const emails: string[] = [];
  const phoneNumbers: string[] = [];

  // Primary values go first
  if (primary?.email) emails.push(primary.email);
  if (primary?.phoneNumber) phoneNumbers.push(primary.phoneNumber);

  for (const c of secondaries) {
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber))
      phoneNumbers.push(c.phoneNumber);
  }

  return {
    contact: {
      primaryContatctId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map((c) => c.id),
    },
  };
}
