const nodemailer = require('nodemailer');
const env = require('../../config/env');
const templates = require('./email.templates');

class EmailService {
  constructor() {
    this.transporter = null;
    this.configured = false;

    if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASSWORD) {
      const port = Number(env.EMAIL_PORT || 587);

      this.transporter = nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port,
        secure: port === 465,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASSWORD,
        },
      });

      this.configured = true;

      console.log(
        `[Email] SMTP configured: ${env.EMAIL_HOST}:${port} as ${env.EMAIL_USER}`
      );
    } else {
      console.warn(
        '⚠️ EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD not configured. Emails will be skipped safely.'
      );
    }
  }

  async sendTemplateEmail(to, templateName, data) {
    if (!this.configured) {
      console.log(`[Email Skipped] Template: ${templateName}, To: ${to}`);
      return;
    }

    const templateFn = templates[templateName];

    if (!templateFn) {
      console.error(`Email template '${templateName}' not found.`);
      return;
    }

    const { subject, html } = templateFn(data);

    try {
      const info = await this.transporter.sendMail({
        from: env.EMAIL_FROM || env.EMAIL_USER,
        to,
        subject,
        html,
      });

      console.log(
        `[Email] Sent successfully to ${to}. Message ID: ${info.messageId}`
      );

      return info;
    } catch (error) {
      console.error('[Email] Failed to send:', {
        message: error.message,
        code: error.code,
        response: error.response,
        command: error.command,
      });
    }
  }
}

module.exports = new EmailService();