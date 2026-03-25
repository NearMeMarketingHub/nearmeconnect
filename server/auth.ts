import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "./db";
import { db } from "./db";
import { users, adminUsers, adminInvitations, companyMembers, companyInvitations, companies, chatThreads, chatThreadMembers, passwordResetTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./email";
import { syncContactToHubSpot, isHubSpotConnected } from "./hubspot";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "development-secret-key",
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, userType, adminInviteToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning();

      req.session.userId = newUser.id;

      let grantedAdmin = false;
      if (adminInviteToken) {
        const [invitation] = await db.select().from(adminInvitations)
          .where(eq(adminInvitations.token, adminInviteToken));
        
        if (invitation && !invitation.usedAt && new Date(invitation.expiresAt) > new Date()) {
          if (invitation.email.toLowerCase() === email.toLowerCase()) {
            await db.insert(adminUsers).values({
              userId: newUser.id,
              createdAt: new Date().toISOString(),
            });
            await db.update(adminInvitations)
              .set({ usedAt: new Date().toISOString(), usedBy: newUser.id })
              .where(eq(adminInvitations.token, adminInviteToken));
            grantedAdmin = true;
          }
        }
      }

      const redirectTo = grantedAdmin ? "/admin" : (userType === "admin" ? "/admin" : "/client");

      const baseUrl = process.env.REPLIT_DEPLOYMENT
        ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "http://localhost:5000";

      sendWelcomeEmail({
        recipientEmail: newUser.email!,
        recipientName: `${newUser.firstName || ""} ${newUser.lastName || ""}`.trim() || newUser.email!,
        loginUrl: `${baseUrl}/login`,
      }).catch(err => console.error("Failed to send welcome email:", err));

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        redirectTo,
        message: grantedAdmin
          ? "Account created. You've been granted admin access!"
          : userType === "admin" 
            ? "Account created. You'll need to be granted admin access by an existing admin."
            : "Account created. You'll need to be added to a company by an administrator.",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password, userType } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const [adminRecord] = await db.select().from(adminUsers).where(eq(adminUsers.userId, user.id));
      const isAdmin = !!adminRecord;

      if (userType === "admin" && !isAdmin) {
        return res.status(403).json({ message: "You are not registered as an admin. Please use the Client login." });
      }

      req.session.userId = user.id;

      let redirectTo: string;
      if (!userType) {
        redirectTo = isAdmin ? "/admin" : "/client";
      } else {
        redirectTo = userType === "admin" ? "/admin" : "/client";
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        redirectTo,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      // Get user's company membership (first company)
      const memberships = await db.select().from(companyMembers).where(eq(companyMembers.userId, user.id)).limit(1);
      const companyId = memberships.length > 0 ? memberships[0].companyId : null;
      const companyRole = memberships.length > 0 ? memberships[0].role : null;
      const customRoleId = memberships.length > 0 ? memberships[0].customRoleId : null;

      res.json({
        userId: user.id,
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId,
        companyRole,
        customRoleId,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.patch("/api/auth/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { firstName, lastName } = req.body;
      const [updated] = await db
        .update(users)
        .set({
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .where(eq(users.id, req.session.userId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ firstName: updated.firstName, lastName: updated.lastName });
    } catch (error) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/register-invite", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, inviteToken } = req.body;

      if (!email || !password || !inviteToken) {
        return res.status(400).json({ message: "Email, password, and invitation token are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [invitation] = await db
        .select()
        .from(companyInvitations)
        .where(eq(companyInvitations.token, inviteToken))
        .limit(1);

      if (!invitation) {
        return res.status(400).json({ message: "Invalid invitation" });
      }

      if (invitation.usedAt) {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      const expiresAt = new Date(invitation.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      if (invitation.email && invitation.email !== email) {
        return res.status(400).json({ message: "Email does not match the invitation" });
      }

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already registered. Please login instead." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning();

      await db
        .insert(companyMembers)
        .values({
          userId: newUser.id,
          companyId: invitation.companyId,
          role: invitation.role as "owner" | "admin" | "member",
          createdAt: new Date().toISOString(),
        });

      await db
        .update(companyInvitations)
        .set({
          usedAt: new Date().toISOString(),
          usedBy: newUser.id,
        })
        .where(eq(companyInvitations.id, invitation.id));

      req.session.userId = newUser.id;

      // Auto-add to company-wide chat thread if it exists
      try {
        const [companyWideThread] = await db
          .select()
          .from(chatThreads)
          .where(and(
            eq(chatThreads.companyId, invitation.companyId),
            eq(chatThreads.isCompanyWide, true)
          ))
          .limit(1);
        
        if (companyWideThread) {
          const [existingChatMember] = await db
            .select()
            .from(chatThreadMembers)
            .where(and(
              eq(chatThreadMembers.threadId, companyWideThread.id),
              eq(chatThreadMembers.userId, newUser.id)
            ))
            .limit(1);
          
          if (!existingChatMember) {
            await db.insert(chatThreadMembers).values({
              threadId: companyWideThread.id,
              userId: newUser.id,
              role: "member",
            });
          }
        }
      } catch (chatErr) {
        console.error("Failed to auto-add to company-wide chat:", chatErr);
      }

      // Send welcome email with company name
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, invitation.companyId))
        .limit(1);

      const baseUrl = process.env.REPLIT_DEPLOYMENT
        ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "http://localhost:5000";

      sendWelcomeEmail({
        recipientEmail: newUser.email!,
        recipientName: `${newUser.firstName || ""} ${newUser.lastName || ""}`.trim() || newUser.email!,
        companyName: company?.name,
        loginUrl: `${baseUrl}/client/dashboard`,
      }).catch(err => console.error("Failed to send welcome email:", err));

      if (isHubSpotConnected()) {
        syncContactToHubSpot({
          email: newUser.email!,
          firstName: newUser.firstName || "",
          lastName: newUser.lastName || "",
          companyName: company?.name,
        }).catch(err => console.error("Auto HubSpot contact sync failed:", err));
      }

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        redirectTo: "/client/dashboard",
      });
    } catch (error) {
      console.error("Invite registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token,
          expiresAt,
          createdAt: new Date().toISOString(),
        });

        const origin = req.headers.origin || req.headers.referer?.replace(/\/+$/, "");
        const baseUrl = origin
          ? origin.replace(/\/+$/, "")
          : process.env.REPLIT_DEPLOYMENT
            ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
            : process.env.REPLIT_DEV_DOMAIN
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : "http://localhost:5000";

        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        sendPasswordResetEmail({
          recipientEmail: user.email!,
          recipientName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email!,
          resetUrl,
          expiresIn: "1 hour",
        }).catch(err => console.error("Failed to send password reset email:", err));
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [resetToken] = await db.select().from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token)).limit(1);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }

      if (new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This reset link has expired" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, resetToken.userId));
      await db.update(passwordResetTokens).set({ usedAt: new Date().toISOString() }).where(eq(passwordResetTokens.id, resetToken.id));

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}

export function isAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  db.select()
    .from(users)
    .where(eq(users.id, req.session.userId))
    .limit(1)
    .then(([user]) => {
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.user = {
        id: user.id,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
      };
      next();
    })
    .catch(() => {
      res.status(500).json({ message: "Authentication error" });
    });
}
