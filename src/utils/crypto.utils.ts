require('dotenv').config();
import crypto from 'crypto';

// Type definition for the encrypted object
interface EncryptedData {
  iv: string;      // Initialization Vector (hex)
  tag: string;     // Authentication Tag (hex)
  content: string; // Encrypted Content (hex)
}

class CryptoUtils {
  private static readonly algorithm = 'aes-256-gcm';
  private static key: Buffer;

  // Static initialization block to load and validate the key once
  /* The `static` block you provided in the `CryptoUtils` class is a static initialization block in
  TypeScript. In TypeScript, static blocks are used to initialize static members of a class before any
  other code is executed. */
  static {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      console.error('FATAL ERROR: ENCRYPTION_KEY environment variable is not set.');
      // Throwing an error or exiting might be appropriate in a real app
      // For now, we'll throw to prevent insecure operation.
      throw new Error('Failed to decrypt data. Data might be corrupted or tampered with.');
    }
    if (Buffer.from(keyHex, 'hex').length !== 32) {
      console.error('FATAL ERROR: ENCRYPTION_KEY must be a 32-byte hex string (64 characters).');
      throw new Error('Failed to decrypt data. Data might be corrupted or tampered with.');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypts a plain text string using AES-256-GCM.
   * Generates a unique IV for each encryption.
   * @param text The plain text string to encrypt.
   * @returns An object containing the hex-encoded iv, tag, and encrypted content.
   * @throws InternalServerException if encryption fails.
   */
  public static encrypt(text: string): EncryptedData {
    try {
      const iv = crypto.randomBytes(12); // GCM recommends 12 bytes IV
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        content: encrypted.toString('hex'),
      };
    } catch (error) {
      console.error("Encryption failed:", error);
      // Do not expose internal error details generally
      throw new Error('Failed to decrypt data. Data might be corrupted or tampered with.');
    }
  }

  /**
   * Decrypts data previously encrypted with the encrypt method.
   * @param encryptedData An object containing the hex-encoded iv, tag, and content.
   * @returns The original plain text string.
   * @throws BadRequestException if the input data is invalid.
   * @throws InternalServerException if decryption fails (e.g., wrong key, tampered data).
   */
  public static decrypt(encryptedData: EncryptedData): string {
    try {
      if (!encryptedData || !encryptedData.iv || !encryptedData.tag || !encryptedData.content) {
        throw new Error('Failed to decrypt data. Data might be corrupted or tampered with.');
      }

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      const encryptedContent = Buffer.from(encryptedData.content, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error: any) {
      console.error("Decryption failed:", error.message);
      // Authentication errors (wrong tag) often throw specific errors
      // Return a generic error to avoid leaking details
      throw new Error('Failed to decrypt data. Data might be corrupted or tampered with.');
    }
  }
}

export default CryptoUtils; 