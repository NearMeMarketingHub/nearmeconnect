const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const templates = [
  {
    name: "1. Meeting Approval",
    subject: "Meeting Approved: Strategy Review Q1",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .meeting-details { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Meeting Approved</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>Great news! Your meeting request has been approved.</p>
          <div class="meeting-details">
            <h3 style="margin-top: 0;">Strategy Review Q1</h3>
            <p><strong>Date:</strong> March 15, 2026</p>
            <p><strong>Time:</strong> 2:00 PM EST</p>
            <p><strong>Duration:</strong> 60 minutes</p>
            <p><strong>Join Meeting:</strong> <a href="#">Click here to join Microsoft Teams meeting</a></p>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>Notes from the Agency:</strong>
            <p>Looking forward to reviewing the Q1 results with your team.</p>
          </div>
          <p>Add this meeting to your calendar:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="#" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Open Meeting Invite</a></td></tr></table>
          <p style="margin-top: 20px;">If you have any questions, please contact us through the portal chat.</p>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated message from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "2. Training Assignment",
    subject: "New Training Assigned: Social Media Best Practices",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .training-details { background-color: #f5f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .badge-required { background-color: #fee2e2; color: #991b1b; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>New Training Assigned</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>You have been assigned new training to complete.</p>
          <div class="training-details">
            <h3 style="margin-top: 0;">Social Media Best Practices</h3>
            <p>Learn the latest strategies for maximizing engagement on social media platforms.</p>
            <p><strong>Due Date:</strong> April 1, 2026</p>
            <p><span class="badge badge-required">Required</span></p>
          </div>
          <p>Access your training through the client portal:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #7c3aed;" align="center"><a href="#" style="background-color: #7c3aed; border: 8px solid #7c3aed; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Training</a></td></tr></table>
          <p style="margin-top: 20px;">If you have any questions, please contact us through the portal chat.</p>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated message from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "3. Training Reminder",
    subject: "Training Reminder: Social Media Best Practices - Due April 1, 2026",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .reminder-box { background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Training Reminder</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>This is a friendly reminder about your pending training.</p>
          <div class="reminder-box">
            <h3 style="margin-top: 0;">Social Media Best Practices</h3>
            <p>This training is due in 3 days.</p>
            <p><strong>Due Date:</strong> April 1, 2026</p>
          </div>
          <p>Complete your training through the client portal:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #f59e0b;" align="center"><a href="#" style="background-color: #f59e0b; border: 8px solid #f59e0b; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Complete Training</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated reminder from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "4. Meeting Invitation",
    subject: "Meeting Invitation: Monthly Review",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .meeting-details { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Meeting Invitation</h1></div>
        <div class="content">
          <p>Hello,</p>
          <p>You've been invited to a meeting by Cameron Wells from Acme Corp.</p>
          <div class="meeting-details">
            <h3 style="margin-top: 0;">Monthly Review</h3>
            <p><strong>Date:</strong> March 20, 2026</p>
            <p><strong>Time:</strong> 10:00 AM EST</p>
            <p><strong>Duration:</strong> 30 minutes</p>
            <p><strong>Join Meeting:</strong> <a href="#">Click here to join Microsoft Teams meeting</a></p>
          </div>
          <p>Add this meeting to your calendar:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="#" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Open Meeting Invite</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated meeting invitation.</p></div>
      </div></body></html>`
  },
  {
    name: "5. Onboarding Completion",
    subject: "Onboarding Complete: Acme Corp",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .completion-details { background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Client Onboarding Completed</h1></div>
        <div class="content">
          <p>Hi Cameron,</p>
          <p>Great news! <strong>Acme Corp</strong> has completed their onboarding process.</p>
          <div class="completion-details">
            <h3 style="margin-top: 0;">Onboarding Summary</h3>
            <p><strong>Company:</strong> Acme Corp</p>
            <p><strong>Completed By:</strong> Sarah Johnson</p>
            <p><strong>Date:</strong> 2/19/2026</p>
          </div>
          <p>The onboarding document has been uploaded to SharePoint for your review.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="#" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Onboarding Document in SharePoint</a></td></tr></table>
          <p>View the company details in the admin portal:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="#" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View in Portal</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated notification from the client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "6. Task Assignment",
    subject: "New Task Assigned: Design Landing Page",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .task-details { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>New Task Assigned</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>A new task has been assigned to you for Acme Corp.</p>
          <div class="task-details">
            <h3 style="margin-top: 0;">Design Landing Page</h3>
            <p>Create a responsive landing page for the Q2 product launch campaign.</p>
            <p><strong>Due Date:</strong> 4/15/2026</p>
            <p><span class="priority" style="background-color: #ef4444">HIGH</span></p>
          </div>
          <p>View and manage this task in the portal:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #2563eb;" align="center"><a href="#" style="background-color: #2563eb; border: 8px solid #2563eb; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Task</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated notification from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "7. Task Status Change",
    subject: "Task Completed: Design Landing Page",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .status-change { background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; color: white; }
        .arrow { margin: 0 10px; color: #6b7280; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Task Status Updated</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>A task for Acme Corp has been updated.</p>
          <div class="status-change">
            <h3 style="margin-top: 0;">Design Landing Page</h3>
            <p>
              <span class="status" style="background-color: #3b82f6">In Progress</span>
              <span class="arrow">&rarr;</span>
              <span class="status" style="background-color: #22c55e">Completed</span>
            </p>
          </div>
          <p>View task details in the portal:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="#" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Task</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated notification from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "8. Task Due Reminder",
    subject: "Reminder: Design Landing Page - Due 4/15/2026",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .reminder-box { background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Task Due Reminder</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>This is a reminder about a task for Acme Corp.</p>
          <div class="reminder-box">
            <h3 style="margin-top: 0;">Design Landing Page</h3>
            <p>This task is due in 2 days.</p>
            <p><strong>Due Date:</strong> 4/15/2026</p>
          </div>
          <p>Complete your task through the portal:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #f59e0b;" align="center"><a href="#" style="background-color: #f59e0b; border: 8px solid #f59e0b; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Task</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated reminder from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "9. Task Overdue",
    subject: "OVERDUE: Design Landing Page - Due 4/15/2026",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .reminder-box { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Task Overdue</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>This is a reminder about a task for Acme Corp.</p>
          <div class="reminder-box">
            <h3 style="margin-top: 0;">Design Landing Page</h3>
            <p>This task is overdue by 3 days.</p>
            <p><strong>Due Date:</strong> 4/15/2026</p>
          </div>
          <p>Please complete this task as soon as possible:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #ef4444;" align="center"><a href="#" style="background-color: #ef4444; border: 8px solid #ef4444; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Task</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated reminder from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "10. Test / Configuration Email",
    subject: "Test Email - Near Me Connect",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Near Me Connect</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Email Configuration Test</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #28a745; margin-top: 0;">Email Configuration Working!</h2>
            <p>This is a test email from your Near Me Connect client portal.</p>
            <p>If you're seeing this message, your email configuration is set up correctly.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;"><strong>Sender Address:</strong> hello@nearmemarketinghub.com</p>
            <p style="color: #666; font-size: 14px;"><strong>Sent At:</strong> 2/19/2026, 10:30:00 AM</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "11. Welcome Email",
    subject: "Welcome to Near Me Connect!",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to Near Me Connect!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p>Your account has been created successfully for <strong>Acme Corp</strong>.</p>
            <p>You can now access the client portal to:</p>
            <ul style="color: #666;">
              <li>View and manage your tasks</li>
              <li>Track your service credits</li>
              <li>Request campaigns and meetings</li>
              <li>Complete training modules</li>
              <li>Communicate with our team</li>
            </ul>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Login to Your Portal</a></td></tr></table>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "12. Company Invitation",
    subject: "You've been invited to join Acme Corp",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">You're Invited!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>Cameron Wells</strong> has invited you to join <strong>Acme Corp</strong> on Near Me Connect.</p>
            <p>You've been invited as: <strong>Company Admin</strong></p>
            <p style="color: #666; font-size: 14px;">This invitation expires on 3/19/2026</p>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Accept Invitation</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "13. Admin Invitation",
    subject: "You've been invited to join Near Me Connect as an Admin",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Agency Admin Invitation</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>Cameron Wells</strong> has invited you to join <strong>Near Me Connect</strong> as an agency administrator.</p>
            <p>As an admin, you'll be able to manage companies, tasks, campaigns, and more.</p>
            <p style="color: #666; font-size: 14px;">This invitation expires on 3/19/2026</p>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Accept Invitation</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "14. Password Reset",
    subject: "Reset Your Password - Near Me Connect",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p>We received a request to reset your password for your Near Me Connect account.</p>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Reset Password</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "15. Campaign Response (Approved)",
    subject: "Campaign Approved: Spring Product Launch",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Campaign Request Update</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p>Your campaign request has been reviewed:</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Campaign:</strong> Spring Product Launch</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> Digital Marketing</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Approved</span></p>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>Notes from our team:</strong></p>
              <p style="margin: 5px 0 0 0;">Great campaign plan! We'll begin work next week. Deliverables will be tracked in your task dashboard.</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View in Portal</a></td></tr></table>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "16. Credit Purchase Confirmation",
    subject: "Credit Purchase Confirmed - 50 Credits Added",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Purchase Confirmed!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p>Thank you for your credit purchase for <strong>Acme Corp</strong>!</p>
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 24px; color: #155724; font-weight: bold;">+50 Credits</p>
              <p style="margin: 5px 0 0 0; color: #155724;">Growth Package</p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $499.00</p>
              <p style="margin: 5px 0;"><strong>New Credit Balance:</strong> 120 credits</p>
              <p style="margin: 5px 0; color: #666; font-size: 12px;"><strong>Transaction ID:</strong> txn_1abc2def3ghi</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Your Credits</a></td></tr></table>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "17. Low Credit Warning",
    subject: "Low Credit Warning - Acme Corp",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Low Credit Alert</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p>Your credit balance for <strong>Acme Corp</strong> is running low.</p>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #ffc107;">
              <p style="margin: 0; font-size: 24px; color: #856404; font-weight: bold;">5 Credits Remaining</p>
              <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">Warning threshold: 10 credits</p>
            </div>
            <p>To ensure uninterrupted service, consider purchasing additional credits.</p>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Purchase Credits</a></td></tr></table>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "18. Signature Request",
    subject: "Signature Requested: Service Agreement 2026",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Signature Requested</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p><strong>Cameron Wells</strong> has requested your signature on a document.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Document:</strong> Service Agreement 2026</p>
              <p style="margin: 5px 0;"><strong>Due Date:</strong> 3/1/2026</p>
            </div>
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3;">
              <p style="margin: 0;"><strong>Message:</strong></p>
              <p style="margin: 5px 0 0 0;">Please review and sign the updated service agreement for 2026. Let me know if you have any questions.</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Review & Sign</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">Please review the document carefully before signing. Your signature is legally binding.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "19. Signature Completion",
    subject: "Document Completed: Service Agreement 2026",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Document Signed!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p>All parties have signed the document. The signing process is now complete.</p>
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
              <p style="margin: 5px 0; font-weight: bold; color: #155724;">Service Agreement 2026</p>
              <p style="margin: 5px 0; color: #155724; font-size: 14px;">Completed on 2/19/2026</p>
            </div>
            <div style="margin: 15px 0;">
              <p style="margin-bottom: 10px;"><strong>Signers:</strong></p>
              <ul style="color: #666; margin: 0;">
                <li>Sarah Johnson - Signed 2/18/2026</li>
                <li>Cameron Wells - Signed 2/19/2026</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">Download Signed Document</a></td></tr></table>
            </div>
            <p style="color: #666; font-size: 14px;">Keep this email for your records. The signed document is now legally binding.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "20. Chat Notification",
    subject: "New message from Cameron Wells - Project Updates",
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">New Message</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Hi Sarah Johnson,</p>
            <p>You have a new message from <strong>Cameron Wells</strong> in <strong>Project Updates</strong>.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #666; font-style: italic;">"Hey Sarah, just wanted to check in on the landing page progress. The client is asking for an update."</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;"><tr><td style="border-radius: 5px; background-color: #667eea;" align="center"><a href="#" style="background-color: #667eea; border: 8px solid #667eea; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View Conversation</a></td></tr></table>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;"><p>Near Me Marketing Hub</p></div>
        </div>
      </body></html>`
  },
  {
    name: "21. Task Rejection",
    subject: "Task Request Rejected: Custom Widget Design",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .rejection-box { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Task Request Rejected</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>Your task request for <strong>Acme Corp</strong> has been reviewed and was not approved at this time.</p>
          <div class="rejection-box">
            <h3 style="margin-top: 0;">Custom Widget Design</h3>
            <p style="margin-bottom: 0;">Status: <strong style="color: #ef4444;">Rejected</strong></p>
          </div>
          <p>If you have questions about this decision, please reach out to your account manager through the portal chat.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="#" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View in Portal</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated notification from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "22. Meeting Rejection",
    subject: "Meeting Request Rejected: Budget Planning Session",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .rejection-box { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Meeting Request Rejected</h1></div>
        <div class="content">
          <p>Hi Sarah Johnson,</p>
          <p>Your meeting request has been reviewed and was not approved at this time.</p>
          <div class="rejection-box">
            <h3 style="margin-top: 0;">Budget Planning Session</h3>
            <p><strong>Reason:</strong> This meeting type has reached its monthly limit. Please contact your account manager to schedule outside the regular cycle.</p>
            <p style="margin-bottom: 0;">Status: <strong style="color: #ef4444;">Rejected</strong></p>
          </div>
          <p>If you have questions about this decision, please reach out to your account manager through the portal chat.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="#" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View in Portal</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated notification from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "23. Media Upload Complete",
    subject: "Media Upload Complete: Q1 Campaign Assets - Acme Corp",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .status-box { background-color: #ecfdf5; color: #065f46; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .detail { margin: 8px 0; }
        .detail-label { font-weight: bold; color: #374151; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Media Upload Complete</h1></div>
        <div class="content">
          <p>Hi Cameron,</p>
          <p>A media submission has been successfully uploaded to SharePoint.</p>
          <div class="status-box">
            <div class="detail"><span class="detail-label">Title:</span> Q1 Campaign Assets</div>
            <div class="detail"><span class="detail-label">Company:</span> Acme Corp</div>
            <div class="detail"><span class="detail-label">Submitted by:</span> Sarah Johnson</div>
            <div class="detail"><span class="detail-label">Files:</span> 5 files</div>
          </div>
          <p>View the files on SharePoint:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #10b981;" align="center"><a href="#" style="background-color: #10b981; border: 8px solid #10b981; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View on SharePoint</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated notification from your client portal.</p></div>
      </div></body></html>`
  },
  {
    name: "24. Media Upload Failed",
    subject: "Media Upload Failed: Q1 Campaign Assets - Acme Corp",
    html: `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }
        .status-box { background-color: #fef2f2; color: #991b1b; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .detail { margin: 8px 0; }
        .detail-label { font-weight: bold; color: #374151; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head><body><div class="container">
        <div class="header"><h1>Media Upload Failed</h1></div>
        <div class="content">
          <p>Hi Cameron,</p>
          <p>A media submission has failed to upload to SharePoint.</p>
          <div class="status-box">
            <div class="detail"><span class="detail-label">Title:</span> Q1 Campaign Assets</div>
            <div class="detail"><span class="detail-label">Company:</span> Acme Corp</div>
            <div class="detail"><span class="detail-label">Submitted by:</span> Sarah Johnson</div>
            <div class="detail"><span class="detail-label">Files:</span> 3 files</div>
          </div>
          <p>You can download the files from the portal and upload them manually:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 10px 0;"><tr><td style="border-radius: 5px; background-color: #ef4444;" align="center"><a href="#" style="background-color: #ef4444; border: 8px solid #ef4444; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-align: center; text-decoration: none;">View in Portal</a></td></tr></table>
        </div>
        <div class="footer"><p>Near Me Marketing Hub</p><p>This is an automated notification from your client portal.</p></div>
      </div></body></html>`
  }
];

async function generatePDF() {
  const combinedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 30px; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .cover-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 10px;
          margin-bottom: 30px;
          padding: 60px 40px;
        }
        .cover-page h1 { font-size: 42px; margin: 0 0 10px 0; }
        .cover-page h2 { font-size: 24px; font-weight: normal; margin: 0 0 30px 0; opacity: 0.9; }
        .cover-page .date { font-size: 16px; opacity: 0.8; margin-top: 20px; }
        .cover-page .count { font-size: 18px; margin-top: 10px; opacity: 0.85; }
        .toc { padding: 20px 0; margin-bottom: 30px; page-break-after: always; }
        .toc h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .toc-item { padding: 8px 0; border-bottom: 1px solid #eee; color: #555; font-size: 15px; }
        .toc-item strong { color: #333; }
        .template-section { page-break-before: always; margin-bottom: 30px; }
        .template-header {
          background: #f3f4f6;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          border-left: 4px solid #667eea;
        }
        .template-header h2 { margin: 0 0 5px 0; color: #1f2937; font-size: 20px; }
        .template-header .subject { color: #6b7280; font-size: 14px; }
        .template-body {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
      </style>
    </head>
    <body>
      <div class="cover-page">
        <h1>Near Me Connect</h1>
        <h2>Email Template Catalog</h2>
        <div class="count">${templates.length} Email Templates</div>
        <div class="date">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      
      <div class="toc">
        <h2>Table of Contents</h2>
        ${templates.map(t => `<div class="toc-item"><strong>${t.name}</strong><br/><span style="color: #888; font-size: 13px;">Subject: ${t.subject}</span></div>`).join('')}
      </div>
      
      ${templates.map(t => `
        <div class="template-section">
          <div class="template-header">
            <h2>${t.name}</h2>
            <div class="subject">Subject: ${t.subject}</div>
          </div>
          <div class="template-body">
            ${t.html}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(combinedHtml, { waitUntil: 'networkidle0' });

  const outputPath = path.join(__dirname, '..', 'client', 'public', 'email-templates-catalog.pdf');
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });

  console.log(`PDF generated successfully at: ${outputPath}`);
  await browser.close();
}

generatePDF().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
