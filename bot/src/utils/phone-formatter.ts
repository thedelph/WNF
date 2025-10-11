/**
 * Format WhatsApp phone number to E.164 format
 * WhatsApp uses format like: 447123456789@c.us
 * We want to store: +447123456789
 */
export function formatPhoneNumber(whatsappId: string): string {
  // Remove @c.us suffix if present
  const phoneNumber = whatsappId.replace(/@c\.us$/, '');

  // Add + prefix if not present
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}

/**
 * Convert E.164 phone number to WhatsApp ID
 * +447123456789 → 447123456789@c.us
 */
export function toWhatsAppId(phoneNumber: string): string {
  // Remove + prefix
  const cleaned = phoneNumber.replace(/^\+/, '');

  // Add @c.us suffix
  return `${cleaned}@c.us`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Should be 8-15 digits after country code
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phoneNumber);
}
