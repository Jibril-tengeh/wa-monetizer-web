import { WhatsAppCloudApiService } from './whatsappCloudApi.ts';

export interface RenewalAlertRecord {
  id: string;
  adminId: string;
  memberId: string;
  memberName: string;
  phone: string;
  groupName: string;
  type: 'drip_j3' | 'drip_j1' | 'drip_j0' | 'revocation';
  status: 'sent' | 'pending' | 'simulated';
  message: string;
  sentAt: string;
  checkoutUrl?: string;
}

export interface LifecycleScanResult {
  scannedAt: string;
  totalMembersScanned: number;
  expiredCount: number;
  expiringIn3DaysCount: number;
  expiringIn24hCount: number;
  alertsGenerated: RenewalAlertRecord[];
  revokedMemberIds: string[];
}

// In-memory alert logs
const alertHistory: RenewalAlertRecord[] = [];

export class SubscriptionLifecycleService {
  /**
   * Generates a direct single-click renewal checkout URL
   */
  public static generateRenewalUrl(baseUrl: string, groupId: string, planId?: string, memberPhone?: string): string {
    const params = new URLSearchParams();
    params.set('view', 'join');
    params.set('groupId', groupId);
    if (planId) params.set('planId', planId);
    if (memberPhone) params.set('phone', memberPhone);
    return `${baseUrl}/#join?${params.toString()}`;
  }

  /**
   * Evaluates members and sends targeted automated WhatsApp renewal notifications
   */
  public static async executeAutomatedScan(
    members: any[],
    groups: any[],
    plans: any[],
    baseUrl: string = 'https://wamonetizer.app'
  ): Promise<LifecycleScanResult> {
    const now = Date.now();
    const oneDayMs = 24 * 3600 * 1000;
    const threeDaysMs = 3 * oneDayMs;

    let expiredCount = 0;
    let expiringIn3DaysCount = 0;
    let expiringIn24hCount = 0;
    const newAlerts: RenewalAlertRecord[] = [];
    const revokedMemberIds: string[] = [];

    const groupMap = new Map<string, string>();
    groups.forEach(g => groupMap.set(g.id, g.name));

    for (const member of members) {
      if (!member.expiresAt) continue;

      const expiresTime = new Date(member.expiresAt).getTime();
      const diffMs = expiresTime - now;
      const groupName = groupMap.get(member.groupId) || 'Groupe VIP';
      const renewalUrl = this.generateRenewalUrl(baseUrl, member.groupId, member.currentPlanId, member.phone);

      // Case 1: Member is Expired (diffMs <= 0)
      if (diffMs <= 0) {
        expiredCount++;
        revokedMemberIds.push(member.id);

        const alertId = `alert_exp_${member.id}_${Math.floor(now / oneDayMs)}`;
        if (!alertHistory.some(a => a.id === alertId)) {
          const msg = `⚠️ Bonjour ${member.displayName}, votre abonnement au groupe WhatsApp "${groupName}" a expiré.\n\nVotre accès a été révoqué. Pour réintégrer le groupe sans attendre, renouvelez votre adhésion en 1 clic ici :\n👉 ${renewalUrl}\n\nÀ très vite !`;
          
          await WhatsAppCloudApiService.sendMessage({
            to: member.phone || '',
            message: msg
          });

          const record: RenewalAlertRecord = {
            id: alertId,
            adminId: member.adminId || 'admin_default',
            memberId: member.id,
            memberName: member.displayName,
            phone: member.phone || '',
            groupName,
            type: 'revocation',
            status: WhatsAppCloudApiService.isConfigured() ? 'sent' : 'simulated',
            message: msg,
            sentAt: new Date().toISOString(),
            checkoutUrl: renewalUrl
          };

          alertHistory.unshift(record);
          newAlerts.push(record);
        }
      } 
      // Case 2: Member expires in less than 24 hours (J-1 / J-0)
      else if (diffMs <= oneDayMs) {
        expiringIn24hCount++;
        const alertId = `alert_j1_${member.id}_${Math.floor(now / oneDayMs)}`;
        if (!alertHistory.some(a => a.id === alertId)) {
          const hoursLeft = Math.max(1, Math.round(diffMs / (3600 * 1000)));
          const msg = `⏳ [Alerte J-1] Bonjour ${member.displayName}, votre accès au groupe WhatsApp "${groupName}" expire dans ${hoursLeft}h !\n\nÉvitez toute coupure de vos avantages et renouvelez dès maintenant en quelques secondes via Mobile Money :\n👉 ${renewalUrl}`;

          await WhatsAppCloudApiService.sendMessage({
            to: member.phone || '',
            message: msg
          });

          const record: RenewalAlertRecord = {
            id: alertId,
            adminId: member.adminId || 'admin_default',
            memberId: member.id,
            memberName: member.displayName,
            phone: member.phone || '',
            groupName,
            type: 'drip_j1',
            status: WhatsAppCloudApiService.isConfigured() ? 'sent' : 'simulated',
            message: msg,
            sentAt: new Date().toISOString(),
            checkoutUrl: renewalUrl
          };

          alertHistory.unshift(record);
          newAlerts.push(record);
        }
      }
      // Case 3: Member expires in 3 days (J-3)
      else if (diffMs <= threeDaysMs) {
        expiringIn3DaysCount++;
        const alertId = `alert_j3_${member.id}_${Math.floor(now / oneDayMs)}`;
        if (!alertHistory.some(a => a.id === alertId)) {
          const daysLeft = Math.ceil(diffMs / oneDayMs);
          const msg = `📅 [Rappel J-3] Bonjour ${member.displayName}, votre adhésion au groupe WhatsApp "${groupName}" arrive à échéance dans ${daysLeft} jours.\n\nPour continuer à recevoir toutes les opportunités sans interruption, préparez votre renouvellement ici :\n👉 ${renewalUrl}`;

          await WhatsAppCloudApiService.sendMessage({
            to: member.phone || '',
            message: msg
          });

          const record: RenewalAlertRecord = {
            id: alertId,
            adminId: member.adminId || 'admin_default',
            memberId: member.id,
            memberName: member.displayName,
            phone: member.phone || '',
            groupName,
            type: 'drip_j3',
            status: WhatsAppCloudApiService.isConfigured() ? 'sent' : 'simulated',
            message: msg,
            sentAt: new Date().toISOString(),
            checkoutUrl: renewalUrl
          };

          alertHistory.unshift(record);
          newAlerts.push(record);
        }
      }
    }

    return {
      scannedAt: new Date().toISOString(),
      totalMembersScanned: members.length,
      expiredCount,
      expiringIn3DaysCount,
      expiringIn24hCount,
      alertsGenerated: newAlerts,
      revokedMemberIds
    };
  }

  /**
   * Manually trigger simulated member revocation & send notice
   */
  public static async revokeAndNotifyMember(
    member: any,
    groupName: string,
    baseUrl: string = 'https://wamonetizer.app'
  ): Promise<RenewalAlertRecord> {
    const renewalUrl = this.generateRenewalUrl(baseUrl, member.groupId, member.currentPlanId, member.phone);
    const msg = `🛑 Bonjour ${member.displayName}, votre accès au groupe WhatsApp "${groupName}" a été clôturé par l'administrateur.\n\nPour réactiver votre place, renouvelez votre abonnement ici :\n👉 ${renewalUrl}`;

    await WhatsAppCloudApiService.sendMessage({
      to: member.phone || '',
      message: msg
    });

    const record: RenewalAlertRecord = {
      id: `alert_manual_${member.id}_${Date.now()}`,
      adminId: member.adminId || 'admin_default',
      memberId: member.id,
      memberName: member.displayName,
      phone: member.phone || '',
      groupName,
      type: 'revocation',
      status: WhatsAppCloudApiService.isConfigured() ? 'sent' : 'simulated',
      message: msg,
      sentAt: new Date().toISOString(),
      checkoutUrl: renewalUrl
    };

    alertHistory.unshift(record);
    return record;
  }

  /**
   * List alert history
   */
  public static getAlertHistory(adminId?: string): RenewalAlertRecord[] {
    if (!adminId || adminId === 'admin_default') return [...alertHistory];
    return alertHistory.filter(a => a.adminId === adminId);
  }
}
