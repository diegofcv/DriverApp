// WhatsApp API integration utilities
export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppMessageResult> {
  try {
    const response = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to send WhatsApp message",
      };
    }

    return {
      success: true,
      messageId: result.messageId,
      simulated: result.simulated,
    };
  } catch (error) {
    return {
      success: false,
      error: "Network error while sending WhatsApp message",
    };
  }
}

export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  return phone.replace(/\D/g, "");
}

export function validatePhoneNumber(phone: string): boolean {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  // Basic validation - should be at least 10 digits
  return cleanPhone.length >= 10;
}
