import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

async function getApiKey() {
  const credentials = await getCredentials();
  return credentials.apiKey;
}

export async function getUncachableResendClient() {
  const apiKey = await getApiKey();
  const credentials = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: credentials.fromEmail
  };
}

export async function sendInspectionCompleteEmail(
  recipientEmail: string,
  recipientName: string,
  inspectionDetails: {
    type: string;
    propertyName?: string;
    blockName?: string;
    inspectorName: string;
    completedDate: Date;
    inspectionId: string;
  }
) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const subject = `Inspection Complete: ${inspectionDetails.type}`;
    const location = inspectionDetails.propertyName || inspectionDetails.blockName || 'Unknown Location';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header with Inspect360 branding -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #00D5CC 0%, #3B7A8C 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
          <path d="M9 11h4"></path>
          <path d="M11 9v4"></path>
        </svg>
      </div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">Inspection Complete</h1>
    </div>

    <!-- Main content -->
    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${recipientName},</p>
      <p style="margin: 0 0 24px 0; font-size: 16px;">
        An inspection has been completed and is ready for your review.
      </p>

      <!-- Inspection details card -->
      <div style="background-color: #f8f9fa; border-left: 4px solid #00D5CC; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Inspection Details</h2>
        
        <div style="margin-bottom: 12px;">
          <span style="font-weight: 600; color: #555;">Type:</span>
          <span style="color: #333; margin-left: 8px;">${inspectionDetails.type}</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="font-weight: 600; color: #555;">Location:</span>
          <span style="color: #333; margin-left: 8px;">${location}</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="font-weight: 600; color: #555;">Inspector:</span>
          <span style="color: #333; margin-left: 8px;">${inspectionDetails.inspectorName}</span>
        </div>
        
        <div>
          <span style="font-weight: 600; color: #555;">Completed:</span>
          <span style="color: #333; margin-left: 8px;">${inspectionDetails.completedDate.toLocaleString('en-US', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
          })}</span>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}/inspections/${inspectionDetails.inspectionId}` : '#'}" 
           style="display: inline-block; background: linear-gradient(135deg, #00D5CC 0%, #3B7A8C 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          View Inspection Report
        </a>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 14px; color: #666;">
        You can review the full inspection report, including photos and notes, by clicking the button above.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 32px;">
      <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">
        This email was sent from <strong style="color: #00D5CC;">Inspect360</strong> — Your AI-Powered Building Inspection Platform
      </p>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #aaa; text-align: center;">
        © ${new Date().getFullYear()} Inspect360. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await client.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
    });

    console.log('Inspection complete email sent:', response);
    return response;
  } catch (error) {
    console.error('Failed to send inspection complete email:', error);
    throw error;
  }
}
