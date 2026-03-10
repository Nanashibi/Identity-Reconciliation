import type { Contact } from "../generated/prisma/client";
import prisma from "../db";

export async function findContactsByEmailOrPhone(
  email?: string | null,
  phoneNumber?: string | null
): Promise<Contact[]> {
  const conditions: { email?: string; phoneNumber?: string }[] = [];
  if (email) conditions.push({ email });
  if (phoneNumber) conditions.push({ phoneNumber });

  if (conditions.length === 0) return [];

  return prisma.contact.findMany({
    where: {
      OR: conditions,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function findAllContactsByPrimaryId(
  primaryId: number
): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: {
      OR: [{ id: primaryId }, { linkedId: primaryId }],
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createContact(data: {
  email?: string | null;
  phoneNumber?: string | null;
  linkedId?: number | null;
  linkPrecedence: "primary" | "secondary";
}): Promise<Contact> {
  return prisma.contact.create({ data });
}

export async function convertToSecondary(
  contactId: number,
  primaryId: number
): Promise<void> {
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      linkedId: primaryId,
      linkPrecedence: "secondary",
      updatedAt: new Date(),
    },
  });
}

export async function reassignSecondaries(
  oldPrimaryId: number,
  newPrimaryId: number
): Promise<void> {
  await prisma.contact.updateMany({
    where: { linkedId: oldPrimaryId, deletedAt: null },
    data: {
      linkedId: newPrimaryId,
      updatedAt: new Date(),
    },
  });
}
