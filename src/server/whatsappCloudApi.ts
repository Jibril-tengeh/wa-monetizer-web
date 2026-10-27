export interface WhatsAppMessagePayload {
  to: string; // E.164 phone without '+' (e.g. 233241234567)
  message: string;
  previewUrl?: boolean;
}

export class WhatsAppCloudApiService {
  private static get phoneNumberId(): string {
    return process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  private static get accessToken(): string {
    return process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  public static isConfigured(): boolean {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  /**
   * Sends an official WhatsApp message via Meta Cloud API v20.0
   */
  public static async sendMessage(payload: WhatsAppMessagePayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanTo = payload.to.replace(/[^0-9]/g, '');

    if (!this.isConfigured()) {
      console.log(`[WhatsApp Cloud API Mock/Sandbox] Message non envoyé (API non configurée). Destinataire: ${cleanTo}, Message: "${payload.message.substring(0, 60)}..."`);
      return {
        success: true,
        messageId: `MOCK_WA_MSG_${Date.now()}`
      };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: payload.previewUrl !== false,
            body: payload.message
          }
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || "Erreur lors de l'envoi via WhatsApp Cloud API");
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id
      };
    } catch (err: any) {
      console.error('Erreur WhatsApp Cloud API:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
