// Resend Email Integration
import { Resend } from 'resend';
import { formatDateET, formatDateTimeET } from './timezone';

let connectionSettings: any;

async function getCredentials(retries = 2, delayMs = 3000) {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (connectionSettings?.settings?.api_key) {
      return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
    }

    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Resend not connected');
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  // Priority: 1. Environment variable, 2. Connection settings, 3. Default
  const senderEmail = process.env.EMAIL_SENDER_ADDRESS || fromEmail || 'hello@nearmemarketinghub.com';
  return {
    client: new Resend(apiKey),
    fromEmail: senderEmail
  };
}

export interface MeetingApprovalEmailData {
  recipientEmail: string;
  recipientName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  teamsLink?: string;
  adminNotes?: string;
  outlookCalendarLink: string;
}

export async function sendMeetingApprovalEmail(data: MeetingApprovalEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const teamsSection = data.teamsLink 
      ? `<p><strong>Join Meeting:</strong> <a href="${data.teamsLink}">Click here to join Microsoft Teams meeting</a></p>`
      : '';
    
    const notesSection = data.adminNotes 
      ? `<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Notes from the Agency:</strong>
          <p>${data.adminNotes}</p>
        </div>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .meeting-details { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
          .button.secondary { background-color: #6b7280; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Approved</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>Great news! Your meeting request has been approved.</p>
            
            <div class="meeting-details">
              <h3 style="margin-top: 0;">${data.meetingTitle}</h3>
              <p><strong>Date:</strong> ${data.meetingDate}</p>
              <p><strong>Time:</strong> ${data.meetingTime}</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              ${teamsSection}
            </div>
            
            ${notesSection}
            
            ${data.outlookCalendarLink ? `
            <p>Add this meeting to your calendar:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="${data.outlookCalendarLink}" target="_blank" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Open Meeting Invite</a></td></tr></table>
            ` : ""}
            
            <p style="margin-top: 20px;">If you have any questions, please contact us through the portal chat.</p>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated message from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Meeting Approved: ${data.meetingTitle}`,
      html,
    });

    console.log(`Meeting approval email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send meeting approval email:', error);
    return false;
  }
}

export interface TrainingAssignmentEmailData {
  recipientEmail: string;
  recipientName: string;
  trainingTitle: string;
  trainingDescription?: string;
  dueDate?: string;
  isRequired: boolean;
  portalUrl: string;
}

export async function sendTrainingAssignmentEmail(data: TrainingAssignmentEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const dueDateSection = data.dueDate 
      ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>`
      : '';
    
    const descriptionSection = data.trainingDescription 
      ? `<p>${data.trainingDescription}</p>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .training-details { background-color: #f5f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-required { background-color: #fee2e2; color: #991b1b; }
          .badge-optional { background-color: #e0e7ff; color: #3730a3; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Training Assigned</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>You have been assigned new training to complete.</p>
            
            <div class="training-details">
              <h3 style="margin-top: 0;">${data.trainingTitle}</h3>
              ${descriptionSection}
              ${dueDateSection}
              <p>
                <span class="badge ${data.isRequired ? 'badge-required' : 'badge-optional'}">
                  ${data.isRequired ? 'Required' : 'Optional'}
                </span>
              </p>
            </div>
            
            <p>Access your training through the client portal:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #7c3aed;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #7c3aed; border: 8px solid #7c3aed; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View Training</a></td></tr></table>
            
            <p style="margin-top: 20px;">If you have any questions, please contact us through the portal chat.</p>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated message from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `New Training Assigned: ${data.trainingTitle}`,
      html,
    });

    console.log(`Training assignment email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send training assignment email:', error);
    return false;
  }
}

export interface TrainingReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  trainingTitle: string;
  dueDate: string;
  daysRemaining: number;
  portalUrl: string;
}

export async function sendTrainingReminderEmail(data: TrainingReminderEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const urgencyText = data.daysRemaining <= 1 
      ? 'is due tomorrow' 
      : data.daysRemaining <= 3 
        ? `is due in ${data.daysRemaining} days` 
        : `is due in ${data.daysRemaining} days`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .reminder-box { background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Training Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>This is a friendly reminder about your pending training.</p>
            
            <div class="reminder-box">
              <h3 style="margin-top: 0;">${data.trainingTitle}</h3>
              <p>This training ${urgencyText}.</p>
              <p><strong>Due Date:</strong> ${data.dueDate}</p>
            </div>
            
            <p>Complete your training through the client portal:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #f59e0b;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #f59e0b; border: 8px solid #f59e0b; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Complete Training</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated reminder from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Training Reminder: ${data.trainingTitle} - Due ${data.dueDate}`,
      html,
    });

    console.log(`Training reminder email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send training reminder email:', error);
    return false;
  }
}

export interface MeetingInviteEmailData {
  recipientEmail: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  teamsLink?: string;
  organizerName: string;
  companyName: string;
  outlookCalendarLink: string;
}

export async function sendMeetingInviteEmail(data: MeetingInviteEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const teamsSection = data.teamsLink 
      ? `<p><strong>Join Meeting:</strong> <a href="${data.teamsLink}">Click here to join Microsoft Teams meeting</a></p>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .meeting-details { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Invitation</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You've been invited to a meeting by ${data.organizerName} from ${data.companyName}.</p>
            
            <div class="meeting-details">
              <h3 style="margin-top: 0;">${data.meetingTitle}</h3>
              <p><strong>Date:</strong> ${data.meetingDate}</p>
              <p><strong>Time:</strong> ${data.meetingTime}</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              ${teamsSection}
            </div>
            
            ${data.outlookCalendarLink ? `
            <p>Add this meeting to your calendar:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="${data.outlookCalendarLink}" target="_blank" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Open Meeting Invite</a></td></tr></table>
            ` : ""}
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated meeting invitation.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Meeting Invitation: ${data.meetingTitle}`,
      html,
    });

    console.log(`Meeting invite email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send meeting invite email:', error);
    return false;
  }
}

export interface OnboardingCompletionEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  completedByName: string;
  sharepointUrl?: string;
  portalUrl: string;
}

export async function sendOnboardingCompletionEmail(data: OnboardingCompletionEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const documentSection = data.sharepointUrl 
      ? `<p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="${data.sharepointUrl}" target="_blank" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View Onboarding Document in SharePoint</a></td></tr></table></p>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .completion-details { background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
          .button.secondary { background-color: #2563eb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Client Onboarding Completed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>Great news! <strong>${data.companyName}</strong> has completed their onboarding process.</p>
            
            <div class="completion-details">
              <h3 style="margin-top: 0;">Onboarding Summary</h3>
              <p><strong>Company:</strong> ${data.companyName}</p>
              <p><strong>Completed By:</strong> ${data.completedByName}</p>
              <p><strong>Date:</strong> ${formatDateET(new Date())}</p>
            </div>
            
            <p>The onboarding document has been uploaded to SharePoint for your review.</p>
            
            ${documentSection}
            
            <p>View the company details in the admin portal:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View in Portal</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated notification from the client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Onboarding Complete: ${data.companyName}`,
      html,
    });

    console.log(`Onboarding completion email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send onboarding completion email:', error);
    return false;
  }
}

// Task notification emails
export interface TaskAssignmentEmailData {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  priority: string;
  companyName: string;
  portalUrl: string;
}

export async function sendTaskAssignmentEmail(data: TaskAssignmentEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const dueDateSection = data.dueDate 
      ? `<p><strong>Due Date:</strong> ${formatDateET(data.dueDate)}</p>`
      : '';
    
    const descriptionSection = data.taskDescription 
      ? `<p>${data.taskDescription}</p>`
      : '';

    const priorityColors: Record<string, string> = {
      low: '#22c55e',
      medium: '#f59e0b', 
      high: '#ef4444',
      urgent: '#dc2626'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .task-details { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Task Assigned</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>A new task has been assigned to you for ${data.companyName}.</p>
            
            <div class="task-details">
              <h3 style="margin-top: 0;">${data.taskTitle}</h3>
              ${descriptionSection}
              ${dueDateSection}
              <p>
                <span class="priority" style="background-color: ${priorityColors[data.priority] || '#6b7280'}">
                  ${data.priority.toUpperCase()}
                </span>
              </p>
            </div>
            
            <p>View and manage this task in the portal:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View Task</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated notification from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `New Task Assigned: ${data.taskTitle}`,
      html,
    });

    console.log(`Task assignment email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send task assignment email:', error);
    return false;
  }
}

export interface TaskStatusChangeEmailData {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  companyName: string;
  portalUrl: string;
}

export async function sendTaskStatusChangeEmail(data: TaskStatusChangeEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const statusColors: Record<string, string> = {
      pending: '#6b7280',
      in_progress: '#3b82f6',
      review: '#f59e0b',
      approved: '#8b5cf6',
      completed: '#22c55e',
      cancelled: '#ef4444'
    };

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      review: 'In Review',
      approved: 'Approved',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .status-change { background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; color: white; }
          .arrow { margin: 0 10px; color: #6b7280; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Task Status Updated</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>A task for ${data.companyName} has been updated.</p>
            
            <div class="status-change">
              <h3 style="margin-top: 0;">${data.taskTitle}</h3>
              <p>
                <span class="status" style="background-color: ${statusColors[data.oldStatus] || '#6b7280'}">
                  ${statusLabels[data.oldStatus] || data.oldStatus}
                </span>
                <span class="arrow">→</span>
                <span class="status" style="background-color: ${statusColors[data.newStatus] || '#6b7280'}">
                  ${statusLabels[data.newStatus] || data.newStatus}
                </span>
              </p>
            </div>
            
            <p>View task details in the portal:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View Task</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated notification from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Task ${statusLabels[data.newStatus] || data.newStatus}: ${data.taskTitle}`,
      html,
    });

    console.log(`Task status change email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send task status change email:', error);
    return false;
  }
}

export interface TaskInReviewEmailData {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  companyName: string;
  portalUrl: string;
}

export async function sendTaskInReviewEmail(data: TaskInReviewEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .review-box { background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Task Ready for Review</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>A task for <strong>${data.companyName}</strong> has been completed by the agency and is now awaiting your review and approval.</p>
            
            <div class="review-box">
              <h3 style="margin-top: 0;">${data.taskTitle}</h3>
              <p style="margin-bottom: 0;">Status: <strong style="color: #f59e0b;">In Review</strong></p>
            </div>
            
            <p>Please review the deliverables and either approve the task or request changes:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #f59e0b;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #f59e0b; border: 8px solid #f59e0b; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Review Task</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated notification from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Task Ready for Review: ${data.taskTitle}`,
      html,
    });

    console.log(`Task in-review email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send task in-review email:', error);
    return false;
  }
}

export interface TaskDueReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  dueDate: string;
  daysRemaining: number;
  companyName: string;
  portalUrl: string;
}

export async function sendTaskDueReminderEmail(data: TaskDueReminderEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const urgencyText = data.daysRemaining === 0 
      ? 'is due today'
      : data.daysRemaining === 1 
        ? 'is due tomorrow'
        : data.daysRemaining < 0
          ? `is overdue by ${Math.abs(data.daysRemaining)} day${Math.abs(data.daysRemaining) > 1 ? 's' : ''}`
          : `is due in ${data.daysRemaining} days`;

    const isOverdue = data.daysRemaining < 0;
    const headerColor = isOverdue ? '#ef4444' : '#f59e0b';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .reminder-box { background-color: ${isOverdue ? '#fef2f2' : '#fffbeb'}; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid ${headerColor}; }
          .button { display: inline-block; background-color: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isOverdue ? 'Task Overdue' : 'Task Due Reminder'}</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>This is a reminder about a task for ${data.companyName}.</p>
            
            <div class="reminder-box">
              <h3 style="margin-top: 0;">${data.taskTitle}</h3>
              <p>This task ${urgencyText}.</p>
              <p><strong>Due Date:</strong> ${formatDateET(data.dueDate)}</p>
            </div>
            
            <p>${isOverdue ? 'Please complete this task as soon as possible:' : 'Complete your task through the portal:'}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: ${headerColor};" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: ${headerColor}; border: 8px solid ${headerColor}; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View Task</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated reminder from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `${isOverdue ? 'OVERDUE' : 'Reminder'}: ${data.taskTitle} - Due ${formatDateET(data.dueDate)}`,
      html,
    });

    console.log(`Task due reminder email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send task due reminder email:', error);
    return false;
  }
}

// Test email function
export async function sendTestEmail(recipientEmail: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Near Me Connect</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Email Configuration Test</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #28a745; margin-top: 0;">✓ Email Configuration Working!</h2>
            <p>This is a test email from your Near Me Connect client portal.</p>
            <p>If you're seeing this message, your email configuration is set up correctly.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;"><strong>Sender Address:</strong> ${fromEmail}</p>
            <p style="color: #666; font-size: 14px;"><strong>Sent At:</strong> ${formatDateTimeET(new Date())}</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: 'Test Email - Near Me Connect',
      html,
    });

    console.log(`Test email sent successfully to ${recipientEmail} from ${fromEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send test email:', error);
    return false;
  }
}

// Welcome email for new users
export interface WelcomeEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName?: string;
  loginUrl: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to Near Me Connect!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>Your account has been created successfully${data.companyName ? ` for <strong>${data.companyName}</strong>` : ''}.</p>
            <p>You can now access the client portal to:</p>
            <ul style="color: #666;">
              <li>View and manage your tasks</li>
              <li>Track your service credits</li>
              <li>Request campaigns and meetings</li>
              <li>Complete training modules</li>
              <li>Communicate with our team</li>
            </ul>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.loginUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Login to Your Portal</a></td></tr></table>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: 'Welcome to Near Me Connect!',
      html,
    });

    console.log(`Welcome email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

// Company invitation email
export interface CompanyInvitationEmailData {
  recipientEmail: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteUrl: string;
  expiresAt?: string;
}

export async function sendCompanyInvitationEmail(data: CompanyInvitationEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">You're Invited!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.companyName}</strong> on Near Me Connect.</p>
            <p>You've been invited as: <strong>${data.role}</strong></p>
            ${data.expiresAt ? `<p style="color: #666; font-size: 14px;">This invitation expires on ${formatDateET(data.expiresAt)}</p>` : ''}
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.inviteUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Accept Invitation</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `You've been invited to join ${data.companyName}`,
      html,
    });

    console.log(`Company invitation email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send company invitation email:', error);
    return false;
  }
}

export interface AdminInvitationEmailData {
  recipientEmail: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt?: string;
}

export async function sendAdminInvitationEmail(data: AdminInvitationEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Agency Admin Invitation</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>Near Me Connect</strong> as an agency administrator.</p>
            <p>As an admin, you'll be able to manage companies, tasks, campaigns, and more.</p>
            ${data.expiresAt ? `<p style="color: #666; font-size: 14px;">This invitation expires on ${formatDateET(data.expiresAt)}</p>` : ''}
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.inviteUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Accept Invitation</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `You've been invited to join Near Me Connect as an Admin`,
      html,
    });

    console.log(`Admin invitation email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send admin invitation email:', error);
    return false;
  }
}

// Password reset email
export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  expiresIn: string;
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>We received a request to reset your password for your Near Me Connect account.</p>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.resetUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Reset Password</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in ${data.expiresIn}.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: 'Reset Your Password - Near Me Connect',
      html,
    });

    console.log(`Password reset email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

// Campaign approval/rejection email
export interface CampaignResponseEmailData {
  recipientEmail: string;
  recipientName: string;
  campaignName: string;
  campaignType: string;
  status: 'approved' | 'rejected';
  adminNotes?: string;
  portalUrl: string;
}

export async function sendCampaignResponseEmail(data: CampaignResponseEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const isApproved = data.status === 'approved';
    const statusColor = isApproved ? '#28a745' : '#dc3545';
    const statusText = isApproved ? 'Approved' : 'Not Approved';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Campaign Request Update</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>Your campaign request has been reviewed:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Campaign:</strong> ${data.campaignName}</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${data.campaignType}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
            </div>
            
            ${data.adminNotes ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>Notes from our team:</strong></p>
              <p style="margin: 5px 0 0 0;">${data.adminNotes}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View in Portal</a></td></tr></table>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Campaign ${statusText}: ${data.campaignName}`,
      html,
    });

    console.log(`Campaign response email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send campaign response email:', error);
    return false;
  }
}

// Credit purchase confirmation email
export interface CreditPurchaseEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  packageName: string;
  creditsAdded: number;
  amountPaid: number;
  newBalance: number;
  transactionId: string;
  portalUrl: string;
}

export async function sendCreditPurchaseEmail(data: CreditPurchaseEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Purchase Confirmed!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>Thank you for your credit purchase for <strong>${data.companyName}</strong>!</p>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 24px; color: #155724; font-weight: bold;">+${data.creditsAdded} Credits</p>
              <p style="margin: 5px 0 0 0; color: #155724;">${data.packageName}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${(data.amountPaid / 100).toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>New Credit Balance:</strong> ${data.newBalance} credits</p>
              <p style="margin: 5px 0; color: #666; font-size: 12px;"><strong>Transaction ID:</strong> ${data.transactionId}</p>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View Your Credits</a></td></tr></table>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Credit Purchase Confirmed - ${data.creditsAdded} Credits Added`,
      html,
    });

    console.log(`Credit purchase email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send credit purchase email:', error);
    return false;
  }
}

// Low credit warning email
export interface LowCreditWarningEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  currentBalance: number;
  warningThreshold: number;
  storeUrl: string;
}

export async function sendLowCreditWarningEmail(data: LowCreditWarningEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Low Credit Alert</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>Your credit balance for <strong>${data.companyName}</strong> is running low.</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #ffc107;">
              <p style="margin: 0; font-size: 24px; color: #856404; font-weight: bold;">${data.currentBalance} Credits Remaining</p>
              <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">Warning threshold: ${data.warningThreshold} credits</p>
            </div>
            
            <p>To ensure uninterrupted service, consider purchasing additional credits.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.storeUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Purchase Credits</a></td></tr></table>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Low Credit Warning - ${data.companyName}`,
      html,
    });

    console.log(`Low credit warning email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send low credit warning email:', error);
    return false;
  }
}

// Projected usage warning email
export interface ProjectedUsageWarningEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  projectedUsage: number;
  monthlyAllotment: number;
  currentBalance: number;
  storeUrl: string;
}

export async function sendProjectedUsageWarningEmail(data: ProjectedUsageWarningEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const overage = data.projectedUsage - data.monthlyAllotment;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e67e22 0%, #e74c3c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Credit Usage Alert</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>Your projected credit usage for <strong>${data.companyName}</strong> this billing period is expected to exceed your monthly allotment.</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #856404;">Monthly Allotment:</td>
                  <td style="padding: 8px 0; color: #856404; font-weight: bold; text-align: right;">${data.monthlyAllotment} credits</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #856404;">Projected Usage:</td>
                  <td style="padding: 8px 0; color: #e74c3c; font-weight: bold; text-align: right;">${data.projectedUsage} credits</td>
                </tr>
                <tr style="border-top: 2px solid #ffc107;">
                  <td style="padding: 8px 0; color: #856404;">Estimated Overage:</td>
                  <td style="padding: 8px 0; color: #e74c3c; font-weight: bold; text-align: right;">+${overage.toFixed(1)} credits</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #856404;">Current Balance:</td>
                  <td style="padding: 8px 0; color: #856404; font-weight: bold; text-align: right;">${data.currentBalance} credits</td>
                </tr>
              </table>
            </div>
            
            <p>To avoid service interruptions, you may want to:</p>
            <ul>
              <li>Purchase additional credits</li>
              <li>Upgrade your subscription tier</li>
              <li>Review and prioritize your current tasks</li>
            </ul>
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.storeUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Purchase Credits</a></td></tr></table>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Credit Usage Alert - ${data.companyName}`,
      html,
    });

    console.log(`Projected usage warning email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send projected usage warning email:', error);
    return false;
  }
}

// E-Signature request email
export interface SignatureRequestEmailData {
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  senderName: string;
  dueDate?: string;
  signUrl: string;
  message?: string;
}

export async function sendSignatureRequestEmail(data: SignatureRequestEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Signature Requested</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p><strong>${data.senderName}</strong> has requested your signature on a document.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Document:</strong> ${data.documentTitle}</p>
              ${data.dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${formatDateET(data.dueDate)}</p>` : ''}
            </div>
            
            ${data.message ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3;">
              <p style="margin: 0;"><strong>Message:</strong></p>
              <p style="margin: 5px 0 0 0;">${data.message}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.signUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Review & Sign</a></td></tr></table>
            </div>
            
            <p style="color: #666; font-size: 14px;">Please review the document carefully before signing. Your signature is legally binding.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Signature Requested: ${data.documentTitle}`,
      html,
    });

    console.log(`Signature request email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send signature request email:', error);
    return false;
  }
}

// E-Signature completion email
export interface SignatureCompletionEmailData {
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  completedAt: string;
  downloadUrl: string;
  participants: Array<{ name: string; signedAt: string }>;
}

export async function sendSignatureCompletionEmail(data: SignatureCompletionEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const participantsList = data.participants.map(p => 
      `<li>${p.name} - Signed ${formatDateET(p.signedAt)}</li>`
    ).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Document Signed!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>All parties have signed the document. The signing process is now complete.</p>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
              <p style="margin: 5px 0; font-weight: bold; color: #155724;">${data.documentTitle}</p>
              <p style="margin: 5px 0; color: #155724; font-size: 14px;">Completed on ${formatDateET(data.completedAt)}</p>
            </div>
            
            <div style="margin: 15px 0;">
              <p style="margin-bottom: 10px;"><strong>Signers:</strong></p>
              <ul style="color: #666; margin: 0;">
                ${participantsList}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.downloadUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Download Signed Document</a></td></tr></table>
            </div>
            
            <p style="color: #666; font-size: 14px;">Keep this email for your records. The signed document is now legally binding.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Document Completed: ${data.documentTitle}`,
      html,
    });

    console.log(`Signature completion email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send signature completion email:', error);
    return false;
  }
}

// Chat message notification email
export interface ChatNotificationEmailData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  threadTitle: string;
  messagePreview: string;
  chatUrl: string;
}

export async function sendChatNotificationEmail(data: ChatNotificationEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">New Message</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>You have a new message from <strong>${data.senderName}</strong> in <strong>${data.threadTitle}</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #666; font-style: italic;">"${data.messagePreview}"</p>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="${data.chatUrl}" target="_blank" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View Conversation</a></td></tr></table>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `New message from ${data.senderName} - ${data.threadTitle}`,
      html,
    });

    console.log(`Chat notification email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send chat notification email:', error);
    return false;
  }
}

export interface MeetingRejectionEmailData {
  recipientEmail: string;
  recipientName: string;
  meetingTitle: string;
  rejectionReason?: string;
  portalUrl: string;
}

export interface TaskRejectionEmailData {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  companyName: string;
  portalUrl: string;
}

export async function sendTaskRejectionEmail(data: TaskRejectionEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .rejection-box { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444; }
          .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Task Request Rejected</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>Your task request for <strong>${data.companyName}</strong> has been reviewed and was not approved at this time.</p>
            
            <div class="rejection-box">
              <h3 style="margin-top: 0;">${data.taskTitle}</h3>
              <p style="margin-bottom: 0;">Status: <strong style="color: #ef4444;">Rejected</strong></p>
            </div>
            
            <p>If you have questions about this decision, please reach out to your account manager through the portal chat.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View in Portal</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated notification from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Task Request Rejected: ${data.taskTitle}`,
      html,
    });

    console.log(`Task rejection email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send task rejection email:', error);
    return false;
  }
}

export async function sendMeetingRejectionEmail(data: MeetingRejectionEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .rejection-box { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444; }
          .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Request Rejected</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>Your meeting request has been reviewed and was not approved at this time.</p>
            
            <div class="rejection-box">
              <h3 style="margin-top: 0;">${data.meetingTitle}</h3>
              ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
              <p style="margin-bottom: 0;">Status: <strong style="color: #ef4444;">Rejected</strong></p>
            </div>
            
            <p>If you have questions about this decision, please reach out to your account manager through the portal chat.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">View in Portal</a></td></tr></table>
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated notification from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Meeting Request Rejected: ${data.meetingTitle}`,
      html,
    });

    console.log(`Meeting rejection email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send meeting rejection email:', error);
    return false;
  }
}

export interface MediaUploadNotificationEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  submissionTitle: string;
  submitterName: string;
  fileCount: number;
  status: "completed" | "failed";
  portalUrl: string;
  sharepointUrl?: string;
}

export async function sendMediaUploadNotificationEmail(data: MediaUploadNotificationEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const isSuccess = data.status === "completed";
    const headerColor = isSuccess ? "#10b981" : "#ef4444";
    const headerTitle = isSuccess ? "Media Upload Complete" : "Media Upload Failed";
    const statusText = isSuccess ? "successfully uploaded to SharePoint" : "failed to upload to SharePoint";
    const statusBg = isSuccess ? "#ecfdf5" : "#fef2f2";
    const statusColor = isSuccess ? "#065f46" : "#991b1b";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
          .status-box { background-color: ${statusBg}; color: ${statusColor}; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .detail { margin: 8px 0; }
          .detail-label { font-weight: bold; color: #374151; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${headerTitle}</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>A media submission has been ${statusText}.</p>
            
            <div class="status-box">
              <div class="detail"><span class="detail-label">Title:</span> ${data.submissionTitle}</div>
              <div class="detail"><span class="detail-label">Company:</span> ${data.companyName}</div>
              <div class="detail"><span class="detail-label">Submitted by:</span> ${data.submitterName}</div>
              <div class="detail"><span class="detail-label">Files:</span> ${data.fileCount} file${data.fileCount !== 1 ? 's' : ''}</div>
            </div>
            
            ${isSuccess && data.sharepointUrl ? `
              <p>View the files on SharePoint:</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="${data.sharepointUrl}" target="_blank" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View on SharePoint</a></td></tr></table>
            ` : ''}
            
            ${!isSuccess ? `
              <p>You can download the files from the portal and upload them manually:</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #ef4444;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #ef4444; border: 8px solid #ef4444; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View in Portal</a></td></tr></table>
            ` : ''}
          </div>
          <div class="footer">
            <p>Near Me Marketing Hub</p>
            <p>This is an automated notification from your client portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: isSuccess
        ? `Media Upload Complete: ${data.submissionTitle} - ${data.companyName}`
        : `Media Upload Failed: ${data.submissionTitle} - ${data.companyName}`,
      html,
    });

    console.log(`Media upload ${data.status} email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send media upload notification email:', error);
    return false;
  }
}

export interface OnboardingReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  portalUrl: string;
  daysSinceCreation: number;
}

export async function sendOnboardingReminderEmail(data: OnboardingReminderEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Onboarding Reminder</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi ${data.recipientName},</p>
            <p>We noticed that onboarding for <strong>${data.companyName}</strong> hasn't been completed yet. It's been ${data.daysSinceCreation} day${data.daysSinceCreation !== 1 ? 's' : ''} since your account was created.</p>
            
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">Why complete onboarding?</p>
              <ul style="color: #78350f; margin: 0; padding-left: 20px;">
                <li>Get your team set up and ready to collaborate</li>
                <li>Share your brand guidelines and preferences</li>
                <li>Help us tailor our services to your needs</li>
                <li>Unlock full access to all portal features</li>
              </ul>
            </div>
            
            <p>Completing onboarding only takes a few minutes and helps us deliver better results for your business.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #f59e0b;" align="center"><a href="${data.portalUrl}" target="_blank" style="background-color: #f59e0b; border: 8px solid #f59e0b; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">Complete Onboarding Now</a></td></tr></table>
            </div>
            
            <p style="color: #666; font-size: 14px;">If you need assistance with onboarding, please reach out to our team through the portal chat.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Near Me Marketing Hub</p>
            <p>This is a weekly reminder. You'll stop receiving these once onboarding is complete.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: data.recipientEmail,
      subject: `Onboarding Reminder: Complete your setup for ${data.companyName}`,
      html,
    });

    console.log(`Onboarding reminder email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send onboarding reminder email:', error);
    return false;
  }
}
