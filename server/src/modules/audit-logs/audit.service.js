const { query } = require('../../config/database');

class AuditService {
  /**
   * Log an audit event.
   * Fails silently (logs to console) if the database insert fails,
   * so it doesn't break the main business transaction.
   */
  async log({ actor_user_id, actor_role, action, entity_type, entity_id, previous_state, new_state, reason, metadata, ip_address, user_agent }) {
    try {
      // Basic sanitization: Never store secrets in metadata
      let safeMetadata = metadata;
      if (safeMetadata) {
        safeMetadata = { ...safeMetadata };
        // Remove known sensitive keys if they accidentally make it here
        const sensitiveKeys = ['password', 'secret', 'token', 'key'];
        for (const key of Object.keys(safeMetadata)) {
          if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            safeMetadata[key] = '[REDACTED]';
          }
        }
      }

      await query(
        `INSERT INTO audit_logs (
          actor_user_id, actor_role, action, entity_type, entity_id,
          previous_state, new_state, reason, metadata, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          actor_user_id || null,
          actor_role || null,
          action,
          entity_type,
          entity_id || null,
          previous_state || null,
          new_state || null,
          reason || null,
          safeMetadata || null,
          ip_address || null,
          user_agent || null
        ]
      );
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // We explicitly do not throw here to avoid breaking the primary transaction
    }
  }
}

module.exports = new AuditService();
