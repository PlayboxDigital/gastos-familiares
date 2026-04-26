/**
 * Utility for cleaning phone numbers for WhatsApp integration
 */
export const cleanPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Generates a WhatsApp link with a predefined message
 */
export const generateWhatsAppLink = (phone: string, message: string): string => {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';
  return `https://wa.me/${cleaned}/?text=${encodeURIComponent(message)}`;
};
