import * as bcrypt from 'bcrypt';

/**
 * Hash a plain text password using bcrypt
 * @param password Plain text password
 * @param rounds Number of salt rounds (default: 12)
 * @returns Hashed password
 */
export async function hashPassword(
  password: string,
  rounds: number = 12,
): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Compare a plain text password with a hashed password
 * @param password Plain text password
 * @param hashedPassword Hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
