"use strict";

const SEVERITY = Object.freeze({
  CRITICAL: "critical",
  WARNING: "warning",
  INFO: "info",
});

class AlertDispatcher {
  /**
   * @param {object} [options]
   * @param {string} [options.webhookUrl]
   * @param {"slack"|"discord"} [options.channelType="slack"]
   * @param {number} [options.throttleWindowMs=5000] - Minimum window between duplicate alerts
   * @param {typeof fetch} [options.fetchFn=globalThis.fetch]
   */
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.ALERT_WEBHOOK_URL || "";
    this.channelType = options.channelType || "slack";
    this.throttleWindowMs = options.throttleWindowMs || 5000;
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.lastDispatched = new Map();
  }

  /**
   * Format Slack-compatible payload
   */
  formatSlackPayload(title, message, severity, metadata) {
    const color =
      severity === SEVERITY.CRITICAL
        ? "#e11d48"
        : severity === SEVERITY.WARNING
        ? "#f59e0b"
        : "#3b82f6";

    return {
      attachments: [
        {
          color,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `[${severity.toUpperCase()}] ${title}`,
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: message,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `*Source:* Stellar PurplePay | *Time:* ${new Date().toISOString()}${
                    metadata ? ` | *Metadata:* \`${JSON.stringify(metadata)}\`` : ""
                  }`,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  /**
   * Format Discord-compatible payload
   */
  formatDiscordPayload(title, message, severity, metadata) {
    const color =
      severity === SEVERITY.CRITICAL
        ? 0xe11d48
        : severity === SEVERITY.WARNING
        ? 0xf59e0b
        : 0x3b82f6;

    return {
      content: `🚨 **[${severity.toUpperCase()}] ${title}**`,
      embeds: [
        {
          title,
          description: message,
          color,
          fields: metadata
            ? Object.entries(metadata).map(([k, v]) => ({
                name: k,
                value: String(v),
                inline: true,
              }))
            : [],
          footer: {
            text: "Stellar PurplePay Alerting Engine",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Dispatches an alert to configured webhook.
   *
   * @param {object} alert
   * @param {string} alert.title
   * @param {string} alert.message
   * @param {"critical"|"warning"|"info"} [alert.severity="warning"]
   * @param {object} [alert.metadata]
   * @returns {Promise<{ sent: boolean, reason?: string, status?: number }>}
   */
  async dispatchAlert(alert = {}) {
    const {
      title = "System Notification",
      message = "An unclassified event occurred.",
      severity = SEVERITY.WARNING,
      metadata = null,
    } = alert;

    if (!this.webhookUrl) {
      return { sent: false, reason: "WEBHOOK_URL_NOT_CONFIGURED" };
    }

    // Rate-limiting deduplication
    const alertKey = `${severity}:${title}`;
    const now = Date.now();
    const lastTime = this.lastDispatched.get(alertKey) || 0;
    if (now - lastTime < this.throttleWindowMs) {
      return { sent: false, reason: "ALERT_THROTTLED" };
    }
    this.lastDispatched.set(alertKey, now);

    const payload =
      this.channelType === "discord"
        ? this.formatDiscordPayload(title, message, severity, metadata)
        : this.formatSlackPayload(title, message, severity, metadata);

    try {
      const res = await this.fetchFn(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return {
        sent: res.ok,
        status: res.status,
      };
    } catch (err) {
      return {
        sent: false,
        reason: err.message,
      };
    }
  }
}

module.exports = {
  AlertDispatcher,
  SEVERITY,
};
