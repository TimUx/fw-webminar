const nodemailer = require('nodemailer');
const { Storage } = require('../utils/storage');

const smtpStorage = new Storage('smtp.json');

/**
 * Create mail transporter from stored SMTP config
 */
async function createTransporter() {
  const config = await smtpStorage.read();
  
  if (!config || !config.host || !config.username) {
    throw new Error('SMTP ist nicht konfiguriert');
  }

  const port = config.port || 587;
  const secure = config.secure || false;
  
  const transportConfig = {
    host: config.host,
    port: port,
    secure: secure,
    auth: {
      user: config.username,
      pass: config.password
    },
    tls: {
      // Allow configurable certificate validation (default: validate certificates)
      // Set config.rejectUnauthorized to false only if using self-signed certificates
      rejectUnauthorized: config.rejectUnauthorized ?? true,
      minVersion: 'TLSv1.2'
    }
  };
  
  // Only set requireTLS for non-secure connections (STARTTLS)
  // Secure connections (port 465) use implicit TLS and don't need STARTTLS
  if (!secure) {
    transportConfig.requireTLS = true;
  }
  
  return nodemailer.createTransport(transportConfig);
}

/**
 * Send test email
 */
async function sendTestEmail(recipient) {
  const transporter = await createTransporter();
  const config = await smtpStorage.read();

  const info = await transporter.sendMail({
    from: config.from || config.username,
    to: recipient,
    subject: 'Webinar Platform - Test E-Mail',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Test E-Mail erfolgreich</h2>
        <p>Die SMTP-Konfiguration funktioniert korrekt.</p>
        <p style="color: #7f8c8d; font-size: 12px;">Gesendet von der Webinar Platform</p>
      </div>
    `
  });

  return info;
}

/**
 * Send result email to participant
 */
async function sendResultEmail(participant, webinar, result) {
  const transporter = await createTransporter();
  const config = await smtpStorage.read();

  const passed = result.passed ? 'bestanden' : 'nicht bestanden';
  const passedColor = result.passed ? '#27ae60' : '#e74c3c';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Webinar Ergebnis</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Hallo ${participant.name}!</h2>
        
        <p>Vielen Dank für Ihre Teilnahme am Webinar:</p>
        <h3 style="color: #3498db; margin: 20px 0;">${webinar.title}</h3>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
          <h3 style="color: #2c3e50; margin-top: 0;">📋 Bestätigung</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #555;">
            Sie haben bestätigt, dass Sie das Webinar vollständig durchgearbeitet und die dargestellten Inhalte sorgfältig gelesen haben. 
            Sie haben versichert, dass Sie die vermittelten Informationen zur Kenntnis genommen und verstanden haben, 
            und dass Ihnen keine weiteren Fragen oder Unklarheiten bezüglich der behandelten Themen offen sind.
          </p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">📊 Ergebnis der Lernkontrolle:</h3>
          <p style="font-size: 18px;">
            <strong>Punkte:</strong> ${result.score} von ${result.totalQuestions}<br>
            <strong>Prozent:</strong> ${result.percentage}%<br>
            <strong>Status:</strong> <span style="color: ${passedColor}; font-weight: bold;">${passed.toUpperCase()}</span>
          </p>
          <p style="color: #7f8c8d; font-size: 14px;">
            Abgeschlossen am: ${new Date(result.completedAt).toLocaleString('de-DE')}
          </p>
        </div>
        
        ${!result.passed ? `
          <div style="background: #fff5f5; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #721c24;">
              Um das Zertifikat zu erhalten, ist eine Mindestpunktzahl erforderlich. 
              Sie können das Webinar jederzeit wiederholen.
            </p>
          </div>
        ` : ''}
        
        <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br>Ihr Webinar-Team</p>
      </div>
      
      <div style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
        <p>Diese E-Mail wurde automatisch generiert. Bitte nicht antworten.</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: config.from || config.username,
    to: participant.email,
    subject: `Webinar Ergebnis: ${webinar.title}`,
    html
  });

  return info;
}

/**
 * Send admin notification
 */
async function sendAdminNotification(participant, webinar, result) {
  const transporter = await createTransporter();
  const config = await smtpStorage.read();

  // Use configured recipient email if available, fallback to sender email
  const recipientEmail = config.recipient || config.from || config.username;

  const passed = result.passed ? 'bestanden' : 'nicht bestanden';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50;">Neue Webinar-Teilnahme</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <p><strong>Webinar:</strong> ${webinar.title}</p>
        <p><strong>Teilnehmer:</strong> ${participant.name}</p>
        <p><strong>E-Mail:</strong> ${participant.email}</p>
        <p><strong>Ergebnis der Lernkontrolle:</strong> ${result.score}/${result.totalQuestions} (${result.percentage}%)</p>
        <p><strong>Status:</strong> ${passed}</p>
        <p><strong>Bestätigung:</strong> ${result.confirmed ? '✓ Erteilt' : '✗ Nicht erteilt'}</p>
        <p><strong>Zeitpunkt:</strong> ${new Date(result.completedAt).toLocaleString('de-DE')}</p>
      </div>
      
      ${result.confirmed ? `
      <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #27ae60;">
        <p style="margin: 0; color: #1b5e20; font-size: 14px;">
          <strong>Bestätigung:</strong> Der Teilnehmer hat bestätigt, dass er das Webinar vollständig durchgearbeitet 
          und verstanden hat, und dass keine Fragen oder Unklarheiten offen sind.
        </p>
      </div>
      ` : ''}
    </div>
  `;

  const info = await transporter.sendMail({
    from: config.from || config.username,
    to: recipientEmail,
    subject: `Neue Teilnahme: ${webinar.title} - ${participant.name}`,
    html
  });

  return info;
}

module.exports = {
  createTransporter,
  sendTestEmail,
  sendResultEmail,
  sendAdminNotification
};
