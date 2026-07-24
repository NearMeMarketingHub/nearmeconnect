import PDFDocument from "pdfkit";
import { ClientOnboarding, Company } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import { formatDateET, formatTimeET, formatDateLongET } from "./timezone";

interface OnboardingPdfData {
  onboarding: ClientOnboarding;
  company: Company;
}

const PLATFORM_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x_twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
};

const LOGO_PATH = path.join(process.cwd(), "attached_assets", "LogoNewMedium_1768860762303.png");

export async function generateOnboardingPdf(data: OnboardingPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { onboarding, company } = data;

    // Add Near Me Connect branding header
    // Add logo in top left corner
    let logoHeight = 0;
    try {
      if (fs.existsSync(LOGO_PATH)) {
        const logoWidth = 50;
        doc.image(LOGO_PATH, 50, 48, { width: logoWidth });
        logoHeight = 25; // Approximate logo height
      }
    } catch (e) {
      // Logo loading failed, continue without it
    }

    // Position document title to the right of logo or below if no logo
    const titleStartY = logoHeight > 0 ? 50 : 50;
    const titleStartX = logoHeight > 0 ? 110 : 50;
    
    // Document title - positioned to right of logo
    if (logoHeight > 0) {
      doc.fontSize(20).font("Helvetica-Bold").fillColor("#000000").text("Client Onboarding Document", titleStartX, titleStartY);
      doc.fontSize(14).font("Helvetica").fillColor("#374151").text(company.name, titleStartX, titleStartY + 26);
      doc.fontSize(9).fillColor("#6b7280").text(`Generated: ${formatDateET(new Date())} at ${formatTimeET(new Date())}`, titleStartX, titleStartY + 46);
      doc.y = 120; // Set y position below header area
    } else {
      // Fallback layout without logo
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#2563eb").text("NEAR ME CONNECT", 50, 40);
      doc.fontSize(20).font("Helvetica-Bold").fillColor("#000000").text("Client Onboarding Document", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(14).font("Helvetica").fillColor("#374151").text(company.name, { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#6b7280").text(`Generated: ${formatDateET(new Date())} at ${formatTimeET(new Date())}`, { align: "center" });
    }
    
    // Divider line
    doc.moveDown(0.5);
    doc.strokeColor("#e5e7eb").lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.strokeColor("#000000");
    doc.fillColor("#000000");
    doc.moveDown(1);

    addSection(doc, "1. Client Information");
    addField(doc, "Company Name", company.name);
    addField(doc, "Subscription Tier", company.subscriptionTier);
    addField(doc, "Monthly Credits", company.monthlyCredits?.toString());
    addField(doc, "Website", onboarding.website);
    addField(doc, "Primary Contact Name", onboarding.primaryContactName);
    addField(doc, "Primary Contact Email", onboarding.primaryContactEmail);
    addField(doc, "Primary Contact Phone", onboarding.primaryContactPhone);
    if (onboarding.specialNotes) {
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica-Bold").text("Special Notes:");
      doc.font("Helvetica").text(onboarding.specialNotes);
    }
    doc.moveDown();

    addSection(doc, "2. Social Media Platforms");
    if (onboarding.socialPlatforms) {
      try {
        const platforms = JSON.parse(onboarding.socialPlatforms);
        if (Array.isArray(platforms) && platforms.length > 0) {
          const existingPlatforms = platforms.filter((p: any) => p.exists);
          const newPlatforms = platforms.filter((p: any) => !p.exists && p.accountCreator);

          if (existingPlatforms.length > 0) {
            doc.fontSize(11).font("Helvetica-Bold").text("Existing Accounts:");
            doc.moveDown(0.3);
            existingPlatforms.forEach((platform: any) => {
              const platformName = PLATFORM_NAMES[platform.platform] || platform.platform;
              doc.font("Helvetica-Bold").fontSize(10).text(`  ${platformName}`);
              doc.font("Helvetica").fontSize(10);
              doc.text(`    Handle: ${platform.handle || "Not provided"}`);
              doc.text(`    Account Email: ${platform.accountEmail || "Not provided"}`);
              if (platform.notes) {
                doc.text(`    Notes: ${platform.notes}`);
              }
              doc.moveDown(0.3);
            });
          }

          if (newPlatforms.length > 0) {
            doc.moveDown(0.3);
            doc.fontSize(11).font("Helvetica-Bold").text("New Accounts to Create:");
            doc.moveDown(0.3);
            newPlatforms.forEach((platform: any) => {
              const platformName = PLATFORM_NAMES[platform.platform] || platform.platform;
              const creator = platform.accountCreator === "agency" ? "Agency will create" : "Client will create";
              doc.font("Helvetica").fontSize(10).text(`  ${platformName} - ${creator}`);
            });
          }

          const noActionPlatforms = platforms.filter((p: any) => !p.exists && !p.accountCreator);
          if (noActionPlatforms.length > 0) {
            doc.moveDown(0.3);
            doc.fontSize(11).font("Helvetica-Bold").text("Not Using:");
            doc.font("Helvetica").fontSize(10);
            const names = noActionPlatforms.map((p: any) => PLATFORM_NAMES[p.platform] || p.platform);
            doc.text(`  ${names.join(", ")}`);
          }
        } else {
          doc.fontSize(10).text("No social platforms configured");
        }
      } catch {
        doc.fontSize(10).text("No social platforms configured");
      }
    } else {
      doc.fontSize(10).text("No social platforms configured");
    }
    doc.moveDown();

    addSection(doc, "3. Account Access Checklist");
    doc.fontSize(10);
    addChecklistItem(doc, "YouTube Channel Invite Sent", onboarding.youtubeInviteDate);
    addChecklistItem(doc, "YouTube Feature Eligibility Confirmed", onboarding.youtubeFeatureEligibilityDate);
    addChecklistItem(doc, "Meta Business Suite Invite Sent", onboarding.metaBusinessInviteDate);
    addChecklistItem(doc, "Google Business Profile Invite Sent", onboarding.googleBusinessInviteDate);
    doc.moveDown();

    addSection(doc, "4. Login Credentials");
    doc.fontSize(10).text(
      onboarding.loginCredentialsProvided
        ? "Login credentials were provided and are stored securely in the client portal. Access them through the Credentials Manager in the Company Info Hub."
        : "No login credentials were provided during onboarding."
    );
    doc.moveDown();

    addSection(doc, "5. Google Business Profile Recovery");
    if (onboarding.needsGbpRecovery) {
      doc.fontSize(10).font("Helvetica-Bold").text("Recovery Requested: Yes");
      doc.font("Helvetica");
      addField(doc, "Business Name", onboarding.gbpBusinessName);
      addField(doc, "Business Address", onboarding.gbpBusinessAddress);
      addField(doc, "Contact Email", onboarding.gbpContactEmail);
      addField(doc, "Contact Phone", onboarding.gbpContactPhone);
      if (onboarding.gbpAdditionalContext) {
        doc.moveDown(0.3);
        doc.font("Helvetica-Bold").text("Additional Context:");
        doc.font("Helvetica").text(onboarding.gbpAdditionalContext);
      }
    } else {
      doc.fontSize(10).text("GBP Recovery not needed");
    }
    doc.moveDown();

    addSection(doc, "6. Brand Assets");
    let hasBrandAssets = false;
    if (onboarding.brandAssetLinks) {
      hasBrandAssets = true;
      doc.fontSize(10).font("Helvetica-Bold").text("Asset Links:");
      doc.font("Helvetica").text(onboarding.brandAssetLinks);
      doc.moveDown(0.3);
    }
    if (onboarding.brandAssetFiles) {
      try {
        const files = JSON.parse(onboarding.brandAssetFiles);
        if (Array.isArray(files) && files.length > 0) {
          hasBrandAssets = true;
          doc.fontSize(10).font("Helvetica-Bold").text(`Uploaded Files (${files.length}):`);
          doc.font("Helvetica");
          files.forEach((file: any) => {
            const uploadDate = file.uploadedAt ? ` - Uploaded: ${formatDateET(file.uploadedAt)}` : "";
            doc.text(`  • ${file.name}${uploadDate}`);
            if (file.sharepointPath) {
              doc.fontSize(9).fillColor("#666666").text(`    SharePoint: ${file.sharepointPath}`);
              doc.fillColor("#000000").fontSize(10);
            }
          });
        }
      } catch {
        // Ignore parse errors
      }
    }
    if (!hasBrandAssets) {
      doc.fontSize(10).text("No brand assets provided");
    }
    doc.moveDown();

    addSection(doc, "7. Seasonal & Holiday Preferences");
    let hasPreferences = false;
    if (onboarding.seasonalPreferences) {
      try {
        const seasons = JSON.parse(onboarding.seasonalPreferences);
        if (Array.isArray(seasons) && seasons.length > 0) {
          hasPreferences = true;
          doc.fontSize(10).font("Helvetica-Bold").text("Selected Seasons:");
          doc.font("Helvetica").text(`  ${seasons.join(", ")}`);
          doc.moveDown(0.3);
        }
      } catch {
        // Ignore parse errors
      }
    }
    if (onboarding.holidayPreferences) {
      try {
        const holidays = JSON.parse(onboarding.holidayPreferences);
        if (Array.isArray(holidays) && holidays.length > 0) {
          hasPreferences = true;
          doc.fontSize(10).font("Helvetica-Bold").text("Selected Holidays:");
          doc.font("Helvetica").text(`  ${holidays.join(", ")}`);
          doc.moveDown(0.3);
        }
      } catch {
        // Ignore parse errors
      }
    }
    if (onboarding.otherHolidays) {
      hasPreferences = true;
      doc.fontSize(10).font("Helvetica-Bold").text("Other Holidays/Events:");
      doc.font("Helvetica").text(`  ${onboarding.otherHolidays}`);
      doc.moveDown(0.3);
    }
    if (onboarding.seasonalNotes) {
      hasPreferences = true;
      doc.fontSize(10).font("Helvetica-Bold").text("Seasonal Notes:");
      doc.font("Helvetica").text(`  ${onboarding.seasonalNotes}`);
    }
    if (!hasPreferences) {
      doc.fontSize(10).text("No seasonal or holiday preferences specified");
    }
    doc.moveDown();

    addSection(doc, "8. Final Checklist Confirmation");
    doc.fontSize(10);
    addConfirmationItem(doc, "Social profiles have been listed", onboarding.socialProfilesListed);
    addConfirmationItem(doc, "Access invites have been sent", onboarding.accessInvitesSent);
    addConfirmationItem(doc, "Login credentials have been provided", onboarding.loginCredentialsProvided);
    addConfirmationItem(doc, "Brand assets have been provided", onboarding.brandAssetsProvided);
    addConfirmationItem(doc, "Seasonal preferences have been confirmed", onboarding.seasonalPreferencesConfirmed);
    doc.moveDown();

    addSection(doc, "9. Authorization & Signature");
    addField(doc, "Authorized By", onboarding.authorizationName);
    addField(doc, "Authorization Date", onboarding.authorizationDate);
    doc.moveDown();

    if (onboarding.authorizationSignature) {
      doc.fontSize(11).font("Helvetica-Bold").text("Signature:");
      doc.moveDown(0.5);
      
      try {
        if (onboarding.authorizationSignature.startsWith("data:image")) {
          const base64Data = onboarding.authorizationSignature.split(",")[1];
          const imageBuffer = Buffer.from(base64Data, "base64");
          doc.image(imageBuffer, { width: 200, height: 80 });
        } else {
          doc.font("Helvetica-Oblique").fontSize(16).text(onboarding.authorizationSignature);
        }
      } catch (err) {
        doc.font("Helvetica").fontSize(10).text("[Signature on file]");
      }
    } else {
      doc.fontSize(10).text("No signature provided");
    }

    // Footer with Near Me Connect branding
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#e5e7eb");
    doc.moveDown(0.5);
    
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#2563eb").text(
      "Near Me Connect",
      { align: "center" }
    );
    doc.fontSize(8).font("Helvetica").fillColor("#6b7280").text(
      "Your Partner in Digital Marketing Success",
      { align: "center" }
    );
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor("#9ca3af").text(
      "This document was automatically generated upon completion of the client onboarding process.",
      { align: "center" }
    );
    doc.text(
      `Document ID: ${onboarding.id} | Company ID: ${company.id}`,
      { align: "center" }
    );
    doc.moveDown(0.2);
    doc.text(
      "hello@nearmemarketinghub.com | www.nearmemarketinghub.com",
      { align: "center" }
    );

    doc.end();
  });
}

function addSection(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > 700) {
    doc.addPage();
  }
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a365d").text(title);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#cbd5e0");
  doc.fillColor("#000000");
  doc.moveDown(0.5);
}

function addField(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined) {
  doc.fontSize(10).font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value || "Not provided");
}

function addChecklistItem(doc: PDFKit.PDFDocument, label: string, dateValue: string | null | undefined) {
  const status = dateValue ? `Completed on ${dateValue}` : "Not yet completed";
  const checkmark = dateValue ? "[X]" : "[ ]";
  doc.font("Helvetica").text(`${checkmark} ${label}: ${status}`);
}

function addConfirmationItem(doc: PDFKit.PDFDocument, label: string, confirmed: boolean | null | undefined) {
  const checkmark = confirmed ? "[X]" : "[ ]";
  const status = confirmed ? "Confirmed" : "Not confirmed";
  doc.font("Helvetica").text(`${checkmark} ${label} - ${status}`);
}

interface MediaFormData {
  [fieldId: string]: string | boolean;
}

interface MediaUploadPdfData {
  title: string;
  profileName: string;
  companyName: string;
  submittedBy: string;
  submittedAt: Date;
  fields: Array<{
    id: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
    options?: string | null;
    sortOrder: number;
  }>;
  formData: MediaFormData;
}

export async function generateMediaUploadFormPdf(data: MediaUploadPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { title, profileName, companyName, submittedBy, submittedAt, fields, formData } = data;

    try {
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 50, 48, { width: 50 });
      }
    } catch (e) {
    }

    doc.fontSize(20).font("Helvetica-Bold").fillColor("#000000").text("Media Upload Form", 110, 50);
    doc.fontSize(14).font("Helvetica").fillColor("#374151").text(title, 110, 76);
    doc.fontSize(9).fillColor("#6b7280").text(`Generated: ${formatDateET(new Date())} at ${formatTimeET(new Date())}`, 110, 96);
    doc.y = 120;

    doc.moveDown(0.5);
    doc.strokeColor("#e5e7eb").lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.strokeColor("#000000");
    doc.fillColor("#000000");
    doc.moveDown(1);

    doc.fontSize(11).font("Helvetica");
    doc.text(`Profile: ${profileName}`);
    doc.text(`Company: ${companyName}`);
    doc.text(`Submitted by: ${submittedBy}`);
    doc.text(`Date: ${formatDateET(submittedAt)} at ${formatTimeET(submittedAt)}`);
    doc.moveDown(1);

    addSection(doc, "Form Responses");

    const sortedFields = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const field of sortedFields) {
      const value = formData[field.id];
      let displayValue: string;

      if (field.fieldType === "checkbox") {
        displayValue = value === true || value === "true" ? "Yes" : "No";
      } else if (field.fieldType === "date" && value) {
        try {
          const dateValue = new Date(value as string);
          displayValue = formatDateLongET(dateValue);
        } catch {
          displayValue = String(value || "Not provided");
        }
      } else {
        displayValue = String(value || "Not provided");
      }

      const fieldLabel = field.label + (field.isRequired ? " *" : "");
      doc.fontSize(10).font("Helvetica-Bold").text(fieldLabel);
      doc.font("Helvetica").fontSize(10).fillColor("#4b5563").text(`  ${displayValue}`);
      doc.fillColor("#000000");
      doc.moveDown(0.5);
    }

    doc.moveDown(1);
    doc.strokeColor("#e5e7eb").lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor("#6b7280").text(`Generated by Near Me Connect`, { align: "center" });

    doc.end();
  });
}
