const nodemailer = require('nodemailer');
const env = require('../../config/env');
const templates = require('./email.templates');

class EmailService {
  constructor() {
    this.transporter = null;
    this.configured = false;

    if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT || 587,
        secure: env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASSWORD,
        },
      });
      this.configured = true;
    } else {
      console.warn('⚠️ EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD not configured. Emails will be skipped safely.');
    }
  }

  /**
   * Sends an email based on a template.
   * Fails gracefully if not configured or if sending fails.
   */
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
      await this.transporter.sendMail({
        from: env.EMAIL_FROM || '"PlaySphere" <noreply@playsphere.local>',
        to,
        subject,
        html,
      });
      // console.log(`Email sent to ${to} for event ${templateName}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      // Explicitly do not throw to avoid rolling back business transactions
    }
  }
}

module.exports = new EmailService();
