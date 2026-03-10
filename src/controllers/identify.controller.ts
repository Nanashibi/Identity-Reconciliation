import { z } from "zod/v4";
import type { Request, Response, NextFunction } from "express";
import { identifyContact } from "../services/contact.service";

const identifySchema = z
  .object({
    email: z.string().email().nullable().optional(),
    phoneNumber: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "At least one of email or phoneNumber is required",
  });

export async function identify(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = identifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { email, phoneNumber } = parsed.data;
    // Normalize phoneNumber to string
    const phone = phoneNumber != null ? String(phoneNumber) : null;
    const result = await identifyContact(email ?? null, phone);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
