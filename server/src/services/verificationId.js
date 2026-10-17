import { randomBytes } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateVerificationId() {
  const bytes = randomBytes(8);
  const token = [...bytes]
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
  return `PI-${token.slice(0, 4)}-${token.slice(4, 8)}`;
}
