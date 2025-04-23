/**
 * mother/modules/notificationManager/integrations/smtp.js
 */
//const nodemailer = require('nodemailer');

module.exports = {
  integrationName: 'SMTP',

  initialize: async (config) => {
    // transporter erstellen
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    return {
      // "notify" => eigentliche Versand-Logik
      notify: async ({ message, priority, recipient, subject, timestamp }) => {
        if (!recipient) return; // o. subject ...
        const finalSubject = subject || `[${priority.toUpperCase()}] Notification`;
        const finalBody = `${message}\nTime: ${timestamp}`;
        
        await transporter.sendMail({
          from: config.user,
          to: recipient,
          subject: finalSubject,
          text: finalBody
        });
      }
    };
  }
};
