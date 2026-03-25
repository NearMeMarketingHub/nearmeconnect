import {
  type Company,
  type InsertCompany,
  type CompanyMember,
  type InsertCompanyMember,
  type AdminUser,
  type InsertAdminUser,
  type Task,
  type InsertTask,
  type TaskCategory,
  type InsertTaskCategory,
  type CreditTransaction,
  type InsertCreditTransaction,
  type DeliverableType,
  type InsertDeliverableType,
  type TaskChecklistItem,
  type InsertTaskChecklistItem,
  type TaskComment,
  type InsertTaskComment,
  type TaskAttachment,
  type InsertTaskAttachment,
  type TaskLink,
  type InsertTaskLink,
  type TaskAssignee,
  type InsertTaskAssignee,
  type CompanyInvitation,
  type InsertCompanyInvitation,
  type ClientOnboarding,
  type InsertClientOnboarding,
  type MediaUpload,
  type InsertMediaUpload,
  type ChatThread,
  type InsertChatThread,
  type ChatThreadMember,
  type InsertChatThreadMember,
  type ChatMessage,
  type InsertChatMessage,
  type ChatReadReceipt,
  type InsertChatReadReceipt,
  type CampaignType,
  type InsertCampaignType,
  type CampaignRequest,
  type InsertCampaignRequest,
  type MeetingType,
  type InsertMeetingType,
  type MeetingRequest,
  type InsertMeetingRequest,
  type TrainingModule,
  type InsertTrainingModule,
  type TrainingAssignment,
  type InsertTrainingAssignment,
  type TrainingCompletion,
  type InsertTrainingCompletion,
  type CreditStoreSettings,
  type InsertCreditStoreSettings,
  type CreditPackage,
  type InsertCreditPackage,
  type CreditSale,
  type InsertCreditSale,
  type CreditPurchase,
  type InsertCreditPurchase,
  type UserTag,
  type InsertUserTag,
  type UserTagAssignment,
  type InsertUserTagAssignment,
  type Notification,
  type InsertNotification,
  type ChatMention,
  type InsertChatMention,
  type User,
  type GovernmentDocument,
  type InsertGovernmentDocument,
  type SigningPacket,
  type InsertSigningPacket,
  type SigningParticipant,
  type InsertSigningParticipant,
  type SigningEvent,
  type InsertSigningEvent,
  type SigningField,
  type InsertSigningField,
  type MediaProfile,
  type InsertMediaProfile,
  type MediaProfileField,
  type InsertMediaProfileField,
  type CompanyMediaProfile,
  type InsertCompanyMediaProfile,
  type MediaSubmission,
  type InsertMediaSubmission,
  type MediaSubmissionFile,
  type InsertMediaSubmissionFile,
  type AdminInvitation,
  type InsertAdminInvitation,
  type CustomRole,
  type InsertCustomRole,
  type NotificationPreference,
  type InsertNotificationPreference,
  type Cadence,
  type InsertCadence,
  type SubscriptionTierDefinition,
  type InsertSubscriptionTierDefinition,
  type MonthlyReportNote,
  type InsertMonthlyReportNote,
  tierCredits,
  type SubscriptionTier,
  companies,
  companyMembers,
  adminUsers,
  adminInvitations,
  tasks,
  taskCategories,
  creditTransactions,
  deliverableTypes,
  taskChecklistItems,
  taskComments,
  taskAttachments,
  taskLinks,
  taskAssignees,
  companyInvitations,
  clientOnboarding,
  mediaUploads,
  chatThreads,
  chatThreadMembers,
  chatMessages,
  chatReadReceipts,
  campaignTypes,
  campaignRequests,
  meetingTypes,
  meetingRequests,
  trainingModules,
  trainingAssignments,
  trainingCompletions,
  creditStoreSettings,
  creditPackages,
  creditSales,
  creditPurchases,
  userTags,
  userTagAssignments,
  notifications,
  chatMentions,
  users,
  governmentDocuments,
  signingPackets,
  signingParticipants,
  signingEvents,
  signingFields,
  mediaProfiles,
  mediaProfileFields,
  companyMediaProfiles,
  mediaSubmissions,
  mediaSubmissionFiles,
  customRoles,
  notificationPreferences,
  cadences,
  subscriptionTierDefinitions,
  monthlyReportNotes,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ne, isNull, isNotNull, gt, lt, sql } from "drizzle-orm";
import { formatDateShortET } from "./timezone";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;

  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined>;

  getCompanyMember(userId: string, companyId: string): Promise<CompanyMember | undefined>;
  getCompanyMembers(companyId: string): Promise<CompanyMember[]>;
  getCompanyMembership(companyId: string, userId: string): Promise<CompanyMember | undefined>;
  getCompanyMemberById(userId: string): Promise<CompanyMember | undefined>;
  getUserCompanies(userId: string): Promise<CompanyMember[]>;
  createCompanyMember(member: InsertCompanyMember): Promise<CompanyMember>;
  deleteCompanyMember(id: string): Promise<void>;
  updateCompanyMemberRole(id: string, role: string, customRoleId?: string | null): Promise<CompanyMember>;

  isAdmin(userId: string): Promise<boolean>;
  getAdminUser(userId: string): Promise<AdminUser | undefined>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  deleteAdminUser(userId: string): Promise<void>;

  getAdminInvitation(token: string): Promise<AdminInvitation | undefined>;
  getAdminInvitationByEmail(email: string): Promise<AdminInvitation | undefined>;
  getAdminInvitations(): Promise<AdminInvitation[]>;
  createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation>;
  markAdminInvitationUsed(token: string, userId: string): Promise<void>;
  deleteAdminInvitation(id: string): Promise<void>;

  getTaskCategories(companyId: string): Promise<TaskCategory[]>;
  getTaskCategory(id: string): Promise<TaskCategory | undefined>;
  createTaskCategory(category: InsertTaskCategory): Promise<TaskCategory>;
  updateTaskCategory(id: string, data: Partial<TaskCategory>): Promise<TaskCategory | undefined>;
  deleteTaskCategory(id: string): Promise<void>;

  getTasks(companyId: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  deleteOldCompletedTasks(daysOld: number): Promise<number>;
  deleteOldCompletedCampaigns(daysOld: number): Promise<number>;
  deleteOldCompletedMeetings(daysOld: number): Promise<number>;

  getCreditTransactions(companyId: string): Promise<CreditTransaction[]>;
  getAllCreditTransactions(): Promise<CreditTransaction[]>;
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;

  getDeliverableTypes(): Promise<DeliverableType[]>;
  getDeliverableType(id: string): Promise<DeliverableType | undefined>;
  createDeliverableType(deliverable: InsertDeliverableType): Promise<DeliverableType>;
  updateDeliverableType(id: string, data: Partial<DeliverableType>): Promise<DeliverableType | undefined>;
  deleteDeliverableType(id: string): Promise<void>;

  getTaskChecklistItems(taskId: string): Promise<TaskChecklistItem[]>;
  getTaskChecklistItem(id: string): Promise<TaskChecklistItem | undefined>;
  createTaskChecklistItem(item: InsertTaskChecklistItem): Promise<TaskChecklistItem>;
  updateTaskChecklistItem(id: string, data: Partial<TaskChecklistItem>): Promise<TaskChecklistItem | undefined>;
  deleteTaskChecklistItem(id: string): Promise<void>;

  getTaskComments(taskId: string): Promise<TaskComment[]>;
  getTaskComment(id: string): Promise<TaskComment | undefined>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  updateTaskComment(id: string, content: string): Promise<TaskComment | undefined>;
  deleteTaskComment(id: string): Promise<void>;

  getTaskAttachments(taskId: string): Promise<TaskAttachment[]>;
  getTaskAttachment(id: string): Promise<TaskAttachment | undefined>;
  createTaskAttachment(attachment: InsertTaskAttachment): Promise<TaskAttachment>;
  deleteTaskAttachment(id: string): Promise<void>;

  getTaskLinks(taskId: string): Promise<TaskLink[]>;
  getTaskLink(id: string): Promise<TaskLink | undefined>;
  createTaskLink(link: InsertTaskLink): Promise<TaskLink>;
  deleteTaskLink(id: string): Promise<void>;

  getTaskAssignees(taskId: string): Promise<TaskAssignee[]>;
  addTaskAssignee(data: InsertTaskAssignee): Promise<TaskAssignee>;
  removeTaskAssignee(taskId: string, userId: string): Promise<void>;
  getTasksByAssignee(userId: string): Promise<TaskAssignee[]>;

  getCompanyInvitation(token: string): Promise<CompanyInvitation | undefined>;
  getCompanyInvitationById(id: string): Promise<CompanyInvitation | undefined>;
  getCompanyInvitations(companyId: string): Promise<CompanyInvitation[]>;
  createCompanyInvitation(invitation: InsertCompanyInvitation): Promise<CompanyInvitation>;
  useCompanyInvitation(token: string, userId: string): Promise<CompanyInvitation | undefined>;
  deleteCompanyInvitation(id: string): Promise<void>;

  getClientOnboarding(companyId: string): Promise<ClientOnboarding | undefined>;
  createClientOnboarding(onboarding: InsertClientOnboarding): Promise<ClientOnboarding>;
  updateClientOnboarding(companyId: string, data: Partial<ClientOnboarding>): Promise<ClientOnboarding | undefined>;

  getMediaUploads(companyId: string): Promise<MediaUpload[]>;
  createMediaUpload(upload: InsertMediaUpload): Promise<MediaUpload>;

  // Chat methods
  getChatThread(id: string): Promise<ChatThread | undefined>;
  getChatThreadsByCompany(companyId: string): Promise<ChatThread[]>;
  getAllChatThreads(): Promise<ChatThread[]>;
  getChatThreadByTask(taskId: string): Promise<ChatThread | undefined>;
  getCompanyWideThread(companyId: string): Promise<ChatThread | undefined>;
  getUserThreads(userId: string): Promise<ChatThread[]>;
  createChatThread(thread: InsertChatThread): Promise<ChatThread>;
  updateChatThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread | undefined>;
  deleteChatThread(id: string): Promise<void>;
  getAutoCloseThreads(): Promise<ChatThread[]>;
  
  getChatThreadMembers(threadId: string): Promise<ChatThreadMember[]>;
  getChatThreadMember(threadId: string, userId: string): Promise<ChatThreadMember | undefined>;
  addChatThreadMember(member: InsertChatThreadMember): Promise<ChatThreadMember>;
  removeChatThreadMember(threadId: string, userId: string): Promise<void>;
  
  getChatMessages(threadId: string, limit?: number): Promise<ChatMessage[]>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(id: string, content: string): Promise<ChatMessage | undefined>;
  
  getChatReadReceipt(threadId: string, userId: string): Promise<ChatReadReceipt | undefined>;
  updateChatReadReceipt(threadId: string, userId: string, messageId: string): Promise<ChatReadReceipt>;
  getUnreadCounts(userId: string): Promise<{ threadId: string; count: number }[]>;

  // Campaign types
  getCampaignTypes(): Promise<CampaignType[]>;
  getCampaignType(id: string): Promise<CampaignType | undefined>;
  createCampaignType(campaignType: InsertCampaignType): Promise<CampaignType>;
  updateCampaignType(id: string, data: Partial<CampaignType>): Promise<CampaignType | undefined>;
  deleteCampaignType(id: string): Promise<void>;

  // Campaign requests
  getCampaignRequests(companyId: string): Promise<CampaignRequest[]>;
  getAllCampaignRequests(): Promise<CampaignRequest[]>;
  getCampaignRequest(id: string): Promise<CampaignRequest | undefined>;
  createCampaignRequest(request: InsertCampaignRequest): Promise<CampaignRequest>;
  updateCampaignRequest(id: string, data: Partial<CampaignRequest>): Promise<CampaignRequest | undefined>;

  // User Tags
  getUserTags(): Promise<UserTag[]>;
  getUserTag(id: string): Promise<UserTag | undefined>;
  createUserTag(tag: InsertUserTag): Promise<UserTag>;
  updateUserTag(id: string, data: Partial<UserTag>): Promise<UserTag | undefined>;
  deleteUserTag(id: string): Promise<void>;

  // User Tag Assignments
  getUserTagAssignments(userId: string): Promise<UserTagAssignment[]>;
  getUserTagAssignment(userId: string, tagId: string): Promise<UserTagAssignment | undefined>;
  assignUserTag(assignment: InsertUserTagAssignment): Promise<UserTagAssignment>;
  removeUserTag(userId: string, tagId: string): Promise<void>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  clearReadNotifications(userId: string): Promise<void>;

  // Chat Mentions
  getChatMentions(messageId: string): Promise<ChatMention[]>;
  createChatMention(mention: InsertChatMention): Promise<ChatMention>;

  // Sandbox methods
  createCompanyWithId(id: string, company: InsertCompany): Promise<Company>;
  createUserWithId(id: string, data: { email: string; password: string; firstName: string; lastName: string }): Promise<User>;
  deleteSandboxData(companyId: string): Promise<void>;
  deleteClientOnboarding(companyId: string): Promise<void>;
  getChatThreads(companyId: string): Promise<ChatThread[]>;

  // Government Documents
  getGovernmentDocuments(companyId: string): Promise<GovernmentDocument[]>;
  getGovernmentDocument(id: string): Promise<GovernmentDocument | undefined>;
  createGovernmentDocument(doc: InsertGovernmentDocument): Promise<GovernmentDocument>;
  updateGovernmentDocument(id: string, data: Partial<GovernmentDocument>): Promise<GovernmentDocument | undefined>;
  deleteGovernmentDocument(id: string): Promise<void>;
  getExpiredGovernmentDocuments(): Promise<GovernmentDocument[]>;

  // Signing Packets (DocuSign-style)
  getSigningPackets(companyId: string): Promise<SigningPacket[]>;
  getSigningPacket(id: string): Promise<SigningPacket | undefined>;
  createSigningPacket(packet: InsertSigningPacket): Promise<SigningPacket>;
  updateSigningPacket(id: string, data: Partial<SigningPacket>): Promise<SigningPacket | undefined>;
  deleteSigningPacket(id: string): Promise<void>;

  // Signing Participants
  getSigningParticipants(packetId: string): Promise<SigningParticipant[]>;
  getSigningParticipant(id: string): Promise<SigningParticipant | undefined>;
  getSigningParticipantByToken(tokenHash: string): Promise<SigningParticipant | undefined>;
  createSigningParticipant(participant: InsertSigningParticipant): Promise<SigningParticipant>;
  updateSigningParticipant(id: string, data: Partial<SigningParticipant>): Promise<SigningParticipant | undefined>;

  // Signing Events
  getSigningEvents(packetId: string): Promise<SigningEvent[]>;
  createSigningEvent(event: InsertSigningEvent): Promise<SigningEvent>;

  // Signing Fields
  getSigningFields(packetId: string): Promise<SigningField[]>;
  getSigningField(id: string): Promise<SigningField | undefined>;
  createSigningField(field: InsertSigningField): Promise<SigningField>;
  updateSigningField(id: string, data: Partial<SigningField>): Promise<SigningField | undefined>;
  deleteSigningField(id: string): Promise<void>;
  deleteSigningFieldsByPacketId(packetId: string): Promise<void>;

  // Media Profiles
  getMediaProfiles(): Promise<MediaProfile[]>;
  getMediaProfile(id: string): Promise<MediaProfile | undefined>;
  createMediaProfile(profile: InsertMediaProfile): Promise<MediaProfile>;
  updateMediaProfile(id: string, data: Partial<MediaProfile>): Promise<MediaProfile | undefined>;
  deleteMediaProfile(id: string): Promise<void>;

  // Media Profile Fields
  getMediaProfileFields(profileId: string): Promise<MediaProfileField[]>;
  getMediaProfileField(id: string): Promise<MediaProfileField | undefined>;
  createMediaProfileField(field: InsertMediaProfileField): Promise<MediaProfileField>;
  updateMediaProfileField(id: string, data: Partial<MediaProfileField>): Promise<MediaProfileField | undefined>;
  deleteMediaProfileField(id: string): Promise<void>;
  deleteMediaProfileFieldsByProfileId(profileId: string): Promise<void>;

  // Company Media Profiles (many-to-many)
  getCompanyMediaProfiles(companyId: string): Promise<CompanyMediaProfile[]>;
  getMediaProfileCompanies(profileId: string): Promise<CompanyMediaProfile[]>;
  assignMediaProfileToCompany(assignment: InsertCompanyMediaProfile): Promise<CompanyMediaProfile>;
  unassignMediaProfileFromCompany(companyId: string, profileId: string): Promise<void>;

  // Media Submissions
  getMediaSubmissions(companyId: string): Promise<MediaSubmission[]>;
  getAllMediaSubmissions(): Promise<MediaSubmission[]>;
  getMediaSubmission(id: string): Promise<MediaSubmission | undefined>;
  createMediaSubmission(submission: InsertMediaSubmission): Promise<MediaSubmission>;
  updateMediaSubmission(id: string, data: Partial<MediaSubmission>): Promise<MediaSubmission | undefined>;

  // Media Submission Files
  getMediaSubmissionFile(id: string): Promise<MediaSubmissionFile | undefined>;
  getMediaSubmissionFiles(submissionId: string): Promise<MediaSubmissionFile[]>;
  createMediaSubmissionFile(file: InsertMediaSubmissionFile): Promise<MediaSubmissionFile>;
  updateMediaSubmissionFile(id: string, data: Partial<MediaSubmissionFile>): Promise<MediaSubmissionFile | undefined>;

  // Custom Roles
  getCustomRoles(): Promise<CustomRole[]>;
  getCustomRole(id: string): Promise<CustomRole | undefined>;
  createCustomRole(role: InsertCustomRole): Promise<CustomRole>;
  updateCustomRole(id: string, data: Partial<CustomRole>): Promise<CustomRole | undefined>;
  deleteCustomRole(id: string): Promise<void>;

  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreference | undefined>;
  upsertNotificationPreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference>;

  // Cadences
  getCadences(companyId: string): Promise<Cadence[]>;
  getAllActiveCadences(): Promise<Cadence[]>;
  getCadence(id: string): Promise<Cadence | undefined>;
  createCadence(cadence: InsertCadence): Promise<Cadence>;
  updateCadence(id: string, data: Partial<Cadence>): Promise<Cadence | undefined>;
  deleteCadence(id: string): Promise<boolean>;

  // Subscription Tier Definitions
  getSubscriptionTierDefinitions(): Promise<SubscriptionTierDefinition[]>;
  getSubscriptionTierDefinition(id: string): Promise<SubscriptionTierDefinition | undefined>;
  getSubscriptionTierDefinitionByKey(key: string): Promise<SubscriptionTierDefinition | undefined>;
  createSubscriptionTierDefinition(data: InsertSubscriptionTierDefinition): Promise<SubscriptionTierDefinition>;
  updateSubscriptionTierDefinition(id: string, data: Partial<SubscriptionTierDefinition>): Promise<SubscriptionTierDefinition | undefined>;

  // Monthly Report Notes
  getMonthlyReportNote(companyId: string, month: number, year: number): Promise<MonthlyReportNote | undefined>;
  getMonthlyReportNotesByMonth(month: number, year: number): Promise<MonthlyReportNote[]>;
  upsertMonthlyReportNote(data: InsertMonthlyReportNote): Promise<MonthlyReportNote>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const tier = (insertCompany.subscriptionTier || "essentials") as SubscriptionTier;
    const monthlyCredits = tierCredits[tier] || 20;
    
    const [company] = await db
      .insert(companies)
      .values({
        ...insertCompany,
        subscriptionTier: tier,
        credits: monthlyCredits,
        monthlyCredits: monthlyCredits,
        renewalDate: this.getNextMonthDate(),
        createdAt: new Date().toISOString(),
      })
      .returning();

    await db.insert(creditTransactions).values({
      companyId: company.id,
      amount: String(monthlyCredits),
      type: "credit",
      description: "Initial credit allocation",
      createdAt: new Date().toISOString(),
      balanceAfter: String(monthlyCredits),
    });

    return company;
  }

  private getNextMonthDate(): string {
    const now = new Date();
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return formatDateShortET(firstOfNextMonth);
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async getCompanyMember(userId: string, companyId: string): Promise<CompanyMember | undefined> {
    const [member] = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.userId, userId), eq(companyMembers.companyId, companyId)));
    return member;
  }

  async getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
    return await db.select().from(companyMembers).where(eq(companyMembers.companyId, companyId));
  }

  async getCompanyMembership(companyId: string, userId: string): Promise<CompanyMember | undefined> {
    const [membership] = await db.select().from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)));
    return membership;
  }

  async getCompanyMemberById(userId: string): Promise<CompanyMember | undefined> {
    const [member] = await db.select().from(companyMembers)
      .where(eq(companyMembers.userId, userId));
    return member;
  }

  async getUserCompanies(userId: string): Promise<CompanyMember[]> {
    return await db.select().from(companyMembers).where(eq(companyMembers.userId, userId));
  }

  async createCompanyMember(member: InsertCompanyMember): Promise<CompanyMember> {
    const [created] = await db.insert(companyMembers).values({
      ...member,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async deleteCompanyMember(id: string): Promise<void> {
    await db.delete(companyMembers).where(eq(companyMembers.id, id));
  }

  async updateCompanyMemberRole(id: string, role: string, customRoleId?: string | null): Promise<CompanyMember> {
    const updateData: any = { role };
    if (customRoleId !== undefined) {
      updateData.customRoleId = customRoleId;
    }
    const [updated] = await db.update(companyMembers).set(updateData).where(eq(companyMembers.id, id)).returning();
    return updated;
  }

  async isAdmin(userId: string): Promise<boolean> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId));
    return !!admin;
  }

  async getAdminUser(userId: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId));
    return admin;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers);
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers).values({
      ...admin,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async deleteAdminUser(userId: string): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.userId, userId));
  }

  async getAdminInvitation(token: string): Promise<AdminInvitation | undefined> {
    const [invitation] = await db.select().from(adminInvitations).where(eq(adminInvitations.token, token));
    return invitation;
  }

  async getAdminInvitationByEmail(email: string): Promise<AdminInvitation | undefined> {
    const [invitation] = await db.select().from(adminInvitations)
      .where(eq(adminInvitations.email, email))
      .orderBy(desc(adminInvitations.createdAt))
      .limit(1);
    return invitation;
  }

  async getAdminInvitations(): Promise<AdminInvitation[]> {
    return await db.select().from(adminInvitations).orderBy(desc(adminInvitations.createdAt));
  }

  async createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation> {
    const [created] = await db.insert(adminInvitations).values({
      ...invitation,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async markAdminInvitationUsed(token: string, userId: string): Promise<void> {
    await db.update(adminInvitations)
      .set({ usedAt: new Date().toISOString(), usedBy: userId })
      .where(eq(adminInvitations.token, token));
  }

  async deleteAdminInvitation(id: string): Promise<void> {
    await db.delete(adminInvitations).where(eq(adminInvitations.id, id));
  }

  async getTaskCategories(companyId: string): Promise<TaskCategory[]> {
    return await db
      .select()
      .from(taskCategories)
      .where(eq(taskCategories.companyId, companyId))
      .orderBy(taskCategories.sortOrder);
  }

  async getTaskCategory(id: string): Promise<TaskCategory | undefined> {
    const [category] = await db
      .select()
      .from(taskCategories)
      .where(eq(taskCategories.id, id));
    return category;
  }

  async createTaskCategory(category: InsertTaskCategory): Promise<TaskCategory> {
    const [created] = await db
      .insert(taskCategories)
      .values({ ...category, createdAt: formatDateShortET(new Date()) })
      .returning();
    return created;
  }

  async updateTaskCategory(id: string, data: Partial<TaskCategory>): Promise<TaskCategory | undefined> {
    const [updated] = await db
      .update(taskCategories)
      .set(data)
      .where(eq(taskCategories.id, id))
      .returning();
    return updated;
  }

  async deleteTaskCategory(id: string): Promise<void> {
    await db.update(tasks).set({ categoryId: null }).where(eq(tasks.categoryId, id));
    await db.delete(taskCategories).where(eq(taskCategories.id, id));
  }

  async getTasks(companyId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.companyId, companyId))
      .orderBy(desc(tasks.createdAt));
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...insertTask,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return task;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    const attachments = await db.select().from(taskAttachments).where(eq(taskAttachments.taskId, id));
    for (const att of attachments) {
      if (att.driveId === "object-storage") {
        try {
          const { deleteObject } = await import("./object-storage-helpers");
          await deleteObject(att.itemId);
        } catch (err) {
          console.error(`Failed to delete Object Storage file ${att.itemId}:`, err);
        }
      }
    }
    await db.delete(taskChecklistItems).where(eq(taskChecklistItems.taskId, id));
    await db.delete(taskComments).where(eq(taskComments.taskId, id));
    await db.delete(taskAttachments).where(eq(taskAttachments.taskId, id));
    await db.delete(taskLinks).where(eq(taskLinks.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async deleteOldCompletedTasks(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString();
    const oldTasks = await db.select({ id: tasks.id }).from(tasks).where(
      and(
        sql`(${tasks.status} = 'completed' OR ${tasks.approvalStatus} = 'rejected')`,
        lt(tasks.createdAt, cutoffStr)
      )
    );
    for (const task of oldTasks) {
      await this.deleteTask(task.id);
    }
    return oldTasks.length;
  }

  async deleteOldCompletedCampaigns(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString();
    const oldCampaigns = await db.select({ id: campaignRequests.id }).from(campaignRequests).where(
      and(
        sql`(${campaignRequests.status} = 'completed' OR ${campaignRequests.status} = 'rejected')`,
        lt(campaignRequests.createdAt, cutoffStr)
      )
    );
    for (const campaign of oldCampaigns) {
      await db.delete(campaignRequests).where(eq(campaignRequests.id, campaign.id));
    }
    return oldCampaigns.length;
  }

  async deleteOldCompletedMeetings(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString();
    const oldMeetings = await db.select({ id: meetingRequests.id }).from(meetingRequests).where(
      and(
        sql`(${meetingRequests.status} = 'completed' OR ${meetingRequests.status} = 'rejected')`,
        sql`COALESCE(${meetingRequests.completedAt}, ${meetingRequests.rejectedAt}, ${meetingRequests.createdAt}) < ${cutoffStr}`
      )
    );
    for (const meeting of oldMeetings) {
      await db.delete(meetingRequests).where(eq(meetingRequests.id, meeting.id));
    }
    return oldMeetings.length;
  }

  async getCreditTransactions(companyId: string): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.companyId, companyId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async getAllCreditTransactions(): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .orderBy(desc(creditTransactions.createdAt));
  }

  async createCreditTransaction(insertTransaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        ...insertTransaction,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return transaction;
  }

  async getDeliverableTypes(): Promise<DeliverableType[]> {
    return await db.select().from(deliverableTypes).orderBy(deliverableTypes.name);
  }

  async getDeliverableType(id: string): Promise<DeliverableType | undefined> {
    const [deliverable] = await db.select().from(deliverableTypes).where(eq(deliverableTypes.id, id));
    return deliverable;
  }

  async createDeliverableType(insertDeliverable: InsertDeliverableType): Promise<DeliverableType> {
    const [deliverable] = await db
      .insert(deliverableTypes)
      .values({
        ...insertDeliverable,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return deliverable;
  }

  async updateDeliverableType(id: string, data: Partial<DeliverableType>): Promise<DeliverableType | undefined> {
    const [deliverable] = await db
      .update(deliverableTypes)
      .set(data)
      .where(eq(deliverableTypes.id, id))
      .returning();
    return deliverable;
  }

  async deleteDeliverableType(id: string): Promise<void> {
    await db.delete(deliverableTypes).where(eq(deliverableTypes.id, id));
  }

  async getTaskChecklistItems(taskId: string): Promise<TaskChecklistItem[]> {
    return await db
      .select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId))
      .orderBy(taskChecklistItems.sortOrder);
  }

  async getTaskChecklistItem(id: string): Promise<TaskChecklistItem | undefined> {
    const [item] = await db.select().from(taskChecklistItems).where(eq(taskChecklistItems.id, id));
    return item;
  }

  async createTaskChecklistItem(item: InsertTaskChecklistItem): Promise<TaskChecklistItem> {
    const [created] = await db
      .insert(taskChecklistItems)
      .values({
        ...item,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateTaskChecklistItem(id: string, data: Partial<TaskChecklistItem>): Promise<TaskChecklistItem | undefined> {
    const [item] = await db
      .update(taskChecklistItems)
      .set(data)
      .where(eq(taskChecklistItems.id, id))
      .returning();
    return item;
  }

  async deleteTaskChecklistItem(id: string): Promise<void> {
    await db.delete(taskChecklistItems).where(eq(taskChecklistItems.id, id));
  }

  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    return await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(taskComments.createdAt);
  }

  async getTaskComment(id: string): Promise<TaskComment | undefined> {
    const [comment] = await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.id, id));
    return comment;
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const [created] = await db
      .insert(taskComments)
      .values({
        ...comment,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateTaskComment(id: string, content: string): Promise<TaskComment | undefined> {
    const [updated] = await db
      .update(taskComments)
      .set({ content, updatedAt: new Date().toISOString() })
      .where(eq(taskComments.id, id))
      .returning();
    return updated;
  }

  async deleteTaskComment(id: string): Promise<void> {
    await db.delete(taskComments).where(eq(taskComments.id, id));
  }

  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    return await db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(desc(taskAttachments.createdAt));
  }

  async getTaskAttachment(id: string): Promise<TaskAttachment | undefined> {
    const [attachment] = await db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.id, id));
    return attachment;
  }

  async createTaskAttachment(attachment: InsertTaskAttachment): Promise<TaskAttachment> {
    const [created] = await db
      .insert(taskAttachments)
      .values({
        ...attachment,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async deleteTaskAttachment(id: string): Promise<void> {
    await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
  }

  async getTaskLinks(taskId: string): Promise<TaskLink[]> {
    return await db
      .select()
      .from(taskLinks)
      .where(eq(taskLinks.taskId, taskId))
      .orderBy(taskLinks.createdAt);
  }

  async getTaskLink(id: string): Promise<TaskLink | undefined> {
    const [link] = await db
      .select()
      .from(taskLinks)
      .where(eq(taskLinks.id, id));
    return link;
  }

  async createTaskLink(link: InsertTaskLink): Promise<TaskLink> {
    const [created] = await db
      .insert(taskLinks)
      .values({
        ...link,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async deleteTaskLink(id: string): Promise<void> {
    await db.delete(taskLinks).where(eq(taskLinks.id, id));
  }

  async getTaskAssignees(taskId: string): Promise<TaskAssignee[]> {
    return await db
      .select()
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, taskId));
  }

  async addTaskAssignee(data: InsertTaskAssignee): Promise<TaskAssignee> {
    const existing = await db
      .select()
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, data.taskId), eq(taskAssignees.userId, data.userId)));
    if (existing.length > 0) return existing[0];
    const [created] = await db
      .insert(taskAssignees)
      .values({ ...data, assignedAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async removeTaskAssignee(taskId: string, userId: string): Promise<void> {
    await db.delete(taskAssignees).where(
      and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId))
    );
  }

  async getTasksByAssignee(userId: string): Promise<TaskAssignee[]> {
    return await db
      .select()
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, userId));
  }

  async getCompanyInvitation(token: string): Promise<CompanyInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(companyInvitations)
      .where(eq(companyInvitations.token, token));
    return invitation;
  }

  async getCompanyInvitationById(id: string): Promise<CompanyInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(companyInvitations)
      .where(eq(companyInvitations.id, id));
    return invitation;
  }

  async getCompanyInvitations(companyId: string): Promise<CompanyInvitation[]> {
    return await db
      .select()
      .from(companyInvitations)
      .where(eq(companyInvitations.companyId, companyId))
      .orderBy(desc(companyInvitations.createdAt));
  }

  async createCompanyInvitation(invitation: InsertCompanyInvitation): Promise<CompanyInvitation> {
    const [created] = await db
      .insert(companyInvitations)
      .values({
        ...invitation,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async useCompanyInvitation(token: string, userId: string): Promise<CompanyInvitation | undefined> {
    const [updated] = await db
      .update(companyInvitations)
      .set({
        usedAt: new Date().toISOString(),
        usedBy: userId,
      })
      .where(eq(companyInvitations.token, token))
      .returning();
    return updated;
  }

  async deleteCompanyInvitation(id: string): Promise<void> {
    await db.delete(companyInvitations).where(eq(companyInvitations.id, id));
  }

  async getClientOnboarding(companyId: string): Promise<ClientOnboarding | undefined> {
    const [onboarding] = await db
      .select()
      .from(clientOnboarding)
      .where(eq(clientOnboarding.companyId, companyId));
    return onboarding;
  }

  async createClientOnboarding(onboarding: InsertClientOnboarding): Promise<ClientOnboarding> {
    const [created] = await db
      .insert(clientOnboarding)
      .values({
        ...onboarding,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateClientOnboarding(companyId: string, data: Partial<ClientOnboarding>): Promise<ClientOnboarding | undefined> {
    const [updated] = await db
      .update(clientOnboarding)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(clientOnboarding.companyId, companyId))
      .returning();
    return updated;
  }

  async getMediaUploads(companyId: string): Promise<MediaUpload[]> {
    return await db
      .select()
      .from(mediaUploads)
      .where(eq(mediaUploads.companyId, companyId))
      .orderBy(desc(mediaUploads.createdAt));
  }

  async createMediaUpload(upload: InsertMediaUpload): Promise<MediaUpload> {
    const [created] = await db
      .insert(mediaUploads)
      .values({
        ...upload,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  // Chat methods
  async getChatThread(id: string): Promise<ChatThread | undefined> {
    const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id));
    return thread;
  }

  async getChatThreadsByCompany(companyId: string): Promise<ChatThread[]> {
    return await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.companyId, companyId))
      .orderBy(desc(chatThreads.createdAt));
  }

  async getAllChatThreads(): Promise<ChatThread[]> {
    return await db
      .select()
      .from(chatThreads)
      .orderBy(desc(chatThreads.createdAt));
  }

  async getChatThreadByTask(taskId: string): Promise<ChatThread | undefined> {
    const [thread] = await db
      .select()
      .from(chatThreads)
      .where(and(eq(chatThreads.taskId, taskId), eq(chatThreads.type, "task")));
    return thread;
  }

  async getCompanyWideThread(companyId: string): Promise<ChatThread | undefined> {
    const [thread] = await db
      .select()
      .from(chatThreads)
      .where(and(eq(chatThreads.companyId, companyId), eq(chatThreads.isCompanyWide, true)));
    return thread;
  }

  async getUserThreads(userId: string): Promise<ChatThread[]> {
    const memberships = await db
      .select()
      .from(chatThreadMembers)
      .where(and(eq(chatThreadMembers.userId, userId), isNull(chatThreadMembers.leftAt)));
    
    if (memberships.length === 0) return [];
    
    const threadIds = memberships.map(m => m.threadId);
    const threads: ChatThread[] = [];
    
    for (const threadId of threadIds) {
      const thread = await this.getChatThread(threadId);
      if (thread) threads.push(thread);
    }
    
    return threads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createChatThread(thread: InsertChatThread): Promise<ChatThread> {
    const [created] = await db
      .insert(chatThreads)
      .values({
        ...thread,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateChatThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread | undefined> {
    const [updated] = await db
      .update(chatThreads)
      .set(updates)
      .where(eq(chatThreads.id, id))
      .returning();
    return updated;
  }

  async deleteChatThread(id: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.threadId, id));
    await db.delete(chatThreadMembers).where(eq(chatThreadMembers.threadId, id));
    await db.delete(chatThreads).where(eq(chatThreads.id, id));
  }

  async mergeChatThreads(targetThreadId: string, sourceThreadId: string): Promise<void> {
    await db.update(chatMessages).set({ threadId: targetThreadId }).where(eq(chatMessages.threadId, sourceThreadId));
    const targetMembers = await this.getChatThreadMembers(targetThreadId);
    const sourceMembers = await this.getChatThreadMembers(sourceThreadId);
    const targetMemberIds = new Set(targetMembers.map(m => m.userId));
    for (const member of sourceMembers) {
      if (!targetMemberIds.has(member.userId)) {
        await this.addChatThreadMember({
          threadId: targetThreadId,
          userId: member.userId,
          isAdmin: member.isAdmin,
          joinedAt: new Date().toISOString(),
        });
      }
    }
    await db.delete(chatReadReceipts).where(eq(chatReadReceipts.threadId, sourceThreadId));
    await db.delete(chatMessages).where(eq(chatMessages.threadId, sourceThreadId));
    await db.delete(chatThreadMembers).where(eq(chatThreadMembers.threadId, sourceThreadId));
    await db.delete(chatThreads).where(eq(chatThreads.id, sourceThreadId));
  }

  async getAutoCloseThreads(): Promise<ChatThread[]> {
    const now = new Date().toISOString();
    return await db
      .select()
      .from(chatThreads)
      .where(and(
        isNotNull(chatThreads.autoCloseAt),
        isNull(chatThreads.closedAt),
        sql`${chatThreads.autoCloseAt} <= ${now}`
      ));
  }

  async getChatThreadMembers(threadId: string): Promise<ChatThreadMember[]> {
    return await db
      .select()
      .from(chatThreadMembers)
      .where(and(eq(chatThreadMembers.threadId, threadId), isNull(chatThreadMembers.leftAt)));
  }

  async getChatThreadMember(threadId: string, userId: string): Promise<ChatThreadMember | undefined> {
    const [member] = await db
      .select()
      .from(chatThreadMembers)
      .where(and(
        eq(chatThreadMembers.threadId, threadId),
        eq(chatThreadMembers.userId, userId),
        isNull(chatThreadMembers.leftAt)
      ));
    return member;
  }

  async addChatThreadMember(member: InsertChatThreadMember): Promise<ChatThreadMember> {
    const [created] = await db
      .insert(chatThreadMembers)
      .values(member)
      .returning();
    return created;
  }

  async removeChatThreadMember(threadId: string, userId: string): Promise<void> {
    await db
      .update(chatThreadMembers)
      .set({ leftAt: new Date().toISOString() })
      .where(and(
        eq(chatThreadMembers.threadId, threadId),
        eq(chatThreadMembers.userId, userId)
      ));
  }

  async getChatMessages(threadId: string, limit: number = 100): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return messages.reverse();
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return message;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db
      .insert(chatMessages)
      .values({
        ...message,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateChatMessage(id: string, content: string): Promise<ChatMessage | undefined> {
    const [updated] = await db
      .update(chatMessages)
      .set({
        content,
        isEdited: true,
        editedAt: new Date().toISOString(),
      })
      .where(eq(chatMessages.id, id))
      .returning();
    return updated;
  }

  async getChatReadReceipt(threadId: string, userId: string): Promise<ChatReadReceipt | undefined> {
    const [receipt] = await db
      .select()
      .from(chatReadReceipts)
      .where(and(
        eq(chatReadReceipts.threadId, threadId),
        eq(chatReadReceipts.userId, userId)
      ));
    return receipt;
  }

  async updateChatReadReceipt(threadId: string, userId: string, messageId: string): Promise<ChatReadReceipt> {
    const existing = await this.getChatReadReceipt(threadId, userId);
    
    if (existing) {
      const [updated] = await db
        .update(chatReadReceipts)
        .set({
          lastReadMessageId: messageId,
          lastReadAt: new Date().toISOString(),
        })
        .where(eq(chatReadReceipts.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(chatReadReceipts)
        .values({
          threadId,
          userId,
          lastReadMessageId: messageId,
          lastReadAt: new Date().toISOString(),
        })
        .returning();
      return created;
    }
  }

  async getUnreadCounts(userId: string): Promise<{ threadId: string; count: number }[]> {
    const memberships = await db
      .select()
      .from(chatThreadMembers)
      .where(and(eq(chatThreadMembers.userId, userId), isNull(chatThreadMembers.leftAt)));
    
    const counts: { threadId: string; count: number }[] = [];
    
    for (const membership of memberships) {
      const receipt = await this.getChatReadReceipt(membership.threadId, userId);
      
      let unreadCount = 0;
      if (receipt?.lastReadMessageId) {
        const lastReadMessage = await this.getChatMessage(receipt.lastReadMessageId);
        if (lastReadMessage) {
          const allMessages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.threadId, membership.threadId));
          
          unreadCount = allMessages.filter(m => 
            new Date(m.createdAt) > new Date(lastReadMessage.createdAt) && m.senderId !== userId
          ).length;
        }
      } else {
        const allMessages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.threadId, membership.threadId));
        unreadCount = allMessages.filter(m => m.senderId !== userId).length;
      }
      
      if (unreadCount > 0) {
        counts.push({ threadId: membership.threadId, count: unreadCount });
      }
    }
    
    return counts;
  }

  // Campaign types
  async getCampaignTypes(): Promise<CampaignType[]> {
    return await db.select().from(campaignTypes).orderBy(desc(campaignTypes.createdAt));
  }

  async getCampaignType(id: string): Promise<CampaignType | undefined> {
    const [type] = await db.select().from(campaignTypes).where(eq(campaignTypes.id, id));
    return type;
  }

  async createCampaignType(campaignType: InsertCampaignType): Promise<CampaignType> {
    const [created] = await db
      .insert(campaignTypes)
      .values({
        ...campaignType,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateCampaignType(id: string, data: Partial<CampaignType>): Promise<CampaignType | undefined> {
    const [updated] = await db
      .update(campaignTypes)
      .set(data)
      .where(eq(campaignTypes.id, id))
      .returning();
    return updated;
  }

  async deleteCampaignType(id: string): Promise<void> {
    await db.delete(campaignTypes).where(eq(campaignTypes.id, id));
  }

  // Campaign requests
  async getCampaignRequests(companyId: string): Promise<CampaignRequest[]> {
    return await db
      .select()
      .from(campaignRequests)
      .where(eq(campaignRequests.companyId, companyId))
      .orderBy(desc(campaignRequests.createdAt));
  }

  async getAllCampaignRequests(): Promise<CampaignRequest[]> {
    return await db.select().from(campaignRequests).orderBy(desc(campaignRequests.createdAt));
  }

  async getCampaignRequest(id: string): Promise<CampaignRequest | undefined> {
    const [request] = await db.select().from(campaignRequests).where(eq(campaignRequests.id, id));
    return request;
  }

  async createCampaignRequest(request: InsertCampaignRequest): Promise<CampaignRequest> {
    const [created] = await db
      .insert(campaignRequests)
      .values({
        ...request,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateCampaignRequest(id: string, data: Partial<CampaignRequest>): Promise<CampaignRequest | undefined> {
    const [updated] = await db
      .update(campaignRequests)
      .set(data)
      .where(eq(campaignRequests.id, id))
      .returning();
    return updated;
  }

  // Meeting types
  async getMeetingTypes(): Promise<MeetingType[]> {
    return await db.select().from(meetingTypes).orderBy(desc(meetingTypes.createdAt));
  }

  async getActiveMeetingTypes(): Promise<MeetingType[]> {
    return await db
      .select()
      .from(meetingTypes)
      .where(eq(meetingTypes.isActive, true))
      .orderBy(meetingTypes.name);
  }

  async getMeetingType(id: string): Promise<MeetingType | undefined> {
    const [type] = await db.select().from(meetingTypes).where(eq(meetingTypes.id, id));
    return type;
  }

  async createMeetingType(meetingType: InsertMeetingType): Promise<MeetingType> {
    const [created] = await db
      .insert(meetingTypes)
      .values({
        ...meetingType,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateMeetingType(id: string, data: Partial<MeetingType>): Promise<MeetingType | undefined> {
    const [updated] = await db
      .update(meetingTypes)
      .set(data)
      .where(eq(meetingTypes.id, id))
      .returning();
    return updated;
  }

  async deleteMeetingType(id: string): Promise<void> {
    await db.delete(meetingTypes).where(eq(meetingTypes.id, id));
  }

  // Meeting requests
  async getMeetingRequests(companyId: string): Promise<MeetingRequest[]> {
    return await db
      .select()
      .from(meetingRequests)
      .where(eq(meetingRequests.companyId, companyId))
      .orderBy(desc(meetingRequests.createdAt));
  }

  async getAllMeetingRequests(): Promise<MeetingRequest[]> {
    return await db.select().from(meetingRequests).orderBy(desc(meetingRequests.createdAt));
  }

  async getMeetingRequest(id: string): Promise<MeetingRequest | undefined> {
    const [request] = await db.select().from(meetingRequests).where(eq(meetingRequests.id, id));
    return request;
  }

  async createMeetingRequest(request: InsertMeetingRequest): Promise<MeetingRequest> {
    const [created] = await db
      .insert(meetingRequests)
      .values({
        ...request,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateMeetingRequest(id: string, data: Partial<MeetingRequest>): Promise<MeetingRequest | undefined> {
    const [updated] = await db
      .update(meetingRequests)
      .set(data)
      .where(eq(meetingRequests.id, id))
      .returning();
    return updated;
  }

  // ============ Training Module Methods ============

  async getTrainingModules(): Promise<TrainingModule[]> {
    return await db.select().from(trainingModules).orderBy(trainingModules.sortOrder);
  }

  async getTrainingModule(id: string): Promise<TrainingModule | undefined> {
    const [module] = await db.select().from(trainingModules).where(eq(trainingModules.id, id));
    return module;
  }

  async createTrainingModule(data: InsertTrainingModule): Promise<TrainingModule> {
    const [created] = await db
      .insert(trainingModules)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async updateTrainingModule(id: string, data: Partial<TrainingModule>): Promise<TrainingModule | undefined> {
    const [updated] = await db
      .update(trainingModules)
      .set(data)
      .where(eq(trainingModules.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingModule(id: string): Promise<void> {
    await db.delete(trainingModules).where(eq(trainingModules.id, id));
  }

  // ============ Training Assignment Methods ============

  async getAllTrainingAssignments(): Promise<TrainingAssignment[]> {
    return await db.select().from(trainingAssignments).orderBy(desc(trainingAssignments.createdAt));
  }

  async getUserTrainingAssignments(userId: string): Promise<TrainingAssignment[]> {
    // Get assignments directly for this user or for their companies
    const userCompanies = await this.getUserCompanies(userId);
    const companyIds = userCompanies.map(c => c.companyId);
    
    const allAssignments = await db.select().from(trainingAssignments);
    
    // Filter for assignments that match this user or their companies
    return allAssignments.filter(a => 
      a.userId === userId || 
      (a.companyId && companyIds.includes(a.companyId))
    );
  }

  async createTrainingAssignment(data: InsertTrainingAssignment): Promise<TrainingAssignment> {
    const [created] = await db
      .insert(trainingAssignments)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }

  async deleteTrainingAssignment(id: string): Promise<void> {
    await db.delete(trainingAssignments).where(eq(trainingAssignments.id, id));
  }

  // ============ Training Completion Methods ============

  async getUserTrainingWithProgress(userId: string): Promise<{
    module: TrainingModule;
    assignment: TrainingAssignment | null;
    completion: TrainingCompletion | null;
  }[]> {
    const assignments = await this.getUserTrainingAssignments(userId);
    const completions = await db
      .select()
      .from(trainingCompletions)
      .where(eq(trainingCompletions.userId, userId));
    
    const modules = await this.getTrainingModules();
    const activeModules = modules.filter(m => m.isActive);
    
    // Get unique module IDs from user's assignments
    const assignedModuleIds = new Set(assignments.map(a => a.trainingModuleId));
    
    return activeModules
      .filter(m => assignedModuleIds.has(m.id))
      .map(module => {
        const assignment = assignments.find(a => a.trainingModuleId === module.id) || null;
        const completion = completions.find(c => c.trainingModuleId === module.id) || null;
        return { module, assignment, completion };
      });
  }

  async createTrainingCompletion(data: InsertTrainingCompletion): Promise<TrainingCompletion> {
    const [created] = await db
      .insert(trainingCompletions)
      .values(data)
      .returning();
    return created;
  }

  async getTrainingCompletions(moduleId?: string, companyId?: string): Promise<TrainingCompletion[]> {
    let query = db.select().from(trainingCompletions);
    
    if (moduleId) {
      query = query.where(eq(trainingCompletions.trainingModuleId, moduleId)) as any;
    }
    
    // If companyId is provided, we need to filter by users in that company
    if (companyId) {
      const members = await this.getCompanyMembers(companyId);
      const memberUserIds = members.map(m => m.userId);
      const completions = await query;
      return completions.filter(c => memberUserIds.includes(c.userId));
    }
    
    return await query;
  }

  // Credit Store Settings
  async getCreditStoreSettings(): Promise<CreditStoreSettings | null> {
    const [settings] = await db.select().from(creditStoreSettings).limit(1);
    return settings || null;
  }

  async upsertCreditStoreSettings(data: Partial<InsertCreditStoreSettings> & { updatedAt: string }): Promise<CreditStoreSettings> {
    const existing = await this.getCreditStoreSettings();
    if (existing) {
      const [updated] = await db
        .update(creditStoreSettings)
        .set(data)
        .where(eq(creditStoreSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(creditStoreSettings)
        .values({
          basePricePerCredit: data.basePricePerCredit || "125.00",
          isStoreEnabled: data.isStoreEnabled ?? true,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        })
        .returning();
      return created;
    }
  }

  // Credit Packages
  async getCreditPackages(activeOnly: boolean = false): Promise<CreditPackage[]> {
    if (activeOnly) {
      return await db.select().from(creditPackages)
        .where(eq(creditPackages.isActive, true))
        .orderBy(creditPackages.sortOrder);
    }
    return await db.select().from(creditPackages).orderBy(creditPackages.sortOrder);
  }

  async getCreditPackage(id: string): Promise<CreditPackage | undefined> {
    const [pkg] = await db.select().from(creditPackages).where(eq(creditPackages.id, id)).limit(1);
    return pkg;
  }

  async createCreditPackage(data: InsertCreditPackage): Promise<CreditPackage> {
    const [created] = await db
      .insert(creditPackages)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updateCreditPackage(id: string, data: Partial<InsertCreditPackage>): Promise<CreditPackage> {
    const [updated] = await db
      .update(creditPackages)
      .set(data)
      .where(eq(creditPackages.id, id))
      .returning();
    return updated;
  }

  async deleteCreditPackage(id: string): Promise<void> {
    await db.delete(creditPackages).where(eq(creditPackages.id, id));
  }

  // Credit Sales
  async getCreditSales(activeOnly: boolean = false): Promise<CreditSale[]> {
    const now = new Date().toISOString();
    if (activeOnly) {
      const allSales = await db.select().from(creditSales)
        .where(eq(creditSales.isActive, true))
        .orderBy(desc(creditSales.createdAt));
      return allSales.filter(s => s.startDate <= now && s.endDate >= now);
    }
    return await db.select().from(creditSales).orderBy(desc(creditSales.createdAt));
  }

  async getCreditSale(id: string): Promise<CreditSale | undefined> {
    const [sale] = await db.select().from(creditSales).where(eq(creditSales.id, id)).limit(1);
    return sale;
  }

  async createCreditSale(data: InsertCreditSale): Promise<CreditSale> {
    const [created] = await db
      .insert(creditSales)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updateCreditSale(id: string, data: Partial<InsertCreditSale>): Promise<CreditSale> {
    const [updated] = await db
      .update(creditSales)
      .set(data)
      .where(eq(creditSales.id, id))
      .returning();
    return updated;
  }

  async deleteCreditSale(id: string): Promise<void> {
    await db.delete(creditSales).where(eq(creditSales.id, id));
  }

  // Credit Purchases
  async getCreditPurchases(companyId?: string): Promise<CreditPurchase[]> {
    if (companyId) {
      return await db.select().from(creditPurchases)
        .where(eq(creditPurchases.companyId, companyId))
        .orderBy(desc(creditPurchases.createdAt));
    }
    return await db.select().from(creditPurchases).orderBy(desc(creditPurchases.createdAt));
  }

  async getCreditPurchase(id: string): Promise<CreditPurchase | undefined> {
    const [purchase] = await db.select().from(creditPurchases).where(eq(creditPurchases.id, id)).limit(1);
    return purchase;
  }

  async getCreditPurchaseBySessionId(sessionId: string): Promise<CreditPurchase | undefined> {
    const [purchase] = await db.select().from(creditPurchases)
      .where(eq(creditPurchases.stripeSessionId, sessionId))
      .limit(1);
    return purchase;
  }

  async createCreditPurchase(data: InsertCreditPurchase): Promise<CreditPurchase> {
    const [created] = await db
      .insert(creditPurchases)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updateCreditPurchase(id: string, data: Partial<CreditPurchase>): Promise<CreditPurchase> {
    const [updated] = await db
      .update(creditPurchases)
      .set(data)
      .where(eq(creditPurchases.id, id))
      .returning();
    return updated;
  }

  async completeCreditPurchase(id: string): Promise<CreditPurchase> {
    const purchase = await this.getCreditPurchase(id);
    if (!purchase) throw new Error("Purchase not found");
    
    // Update purchase status
    const [updated] = await db
      .update(creditPurchases)
      .set({ status: "completed", completedAt: new Date().toISOString() })
      .where(eq(creditPurchases.id, id))
      .returning();
    
    // Add credits to the company
    const company = await this.getCompany(purchase.companyId);
    if (company) {
      await this.updateCompany(purchase.companyId, {
        credits: company.credits + purchase.creditAmount,
      });
    }
    
    return updated;
  }

  // User Tags
  async getUserTags(): Promise<UserTag[]> {
    return await db.select().from(userTags).orderBy(userTags.name);
  }

  async getUserTag(id: string): Promise<UserTag | undefined> {
    const [tag] = await db.select().from(userTags).where(eq(userTags.id, id)).limit(1);
    return tag;
  }

  async createUserTag(data: InsertUserTag): Promise<UserTag> {
    const [created] = await db
      .insert(userTags)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updateUserTag(id: string, data: Partial<UserTag>): Promise<UserTag | undefined> {
    const [updated] = await db
      .update(userTags)
      .set(data)
      .where(eq(userTags.id, id))
      .returning();
    return updated;
  }

  async deleteUserTag(id: string): Promise<void> {
    await db.delete(userTagAssignments).where(eq(userTagAssignments.tagId, id));
    await db.delete(userTags).where(eq(userTags.id, id));
  }

  // User Tag Assignments
  async getUserTagAssignments(userId: string): Promise<UserTagAssignment[]> {
    return await db.select().from(userTagAssignments)
      .where(eq(userTagAssignments.userId, userId));
  }

  async getUserTagAssignment(userId: string, tagId: string): Promise<UserTagAssignment | undefined> {
    const [assignment] = await db.select().from(userTagAssignments)
      .where(and(
        eq(userTagAssignments.userId, userId),
        eq(userTagAssignments.tagId, tagId)
      ))
      .limit(1);
    return assignment;
  }

  async assignUserTag(data: InsertUserTagAssignment): Promise<UserTagAssignment> {
    const existing = await this.getUserTagAssignment(data.userId, data.tagId);
    if (existing) return existing;
    
    const [created] = await db
      .insert(userTagAssignments)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async removeUserTag(userId: string, tagId: string): Promise<void> {
    await db.delete(userTagAssignments).where(
      and(
        eq(userTagAssignments.userId, userId),
        eq(userTagAssignments.tagId, tagId)
      )
    );
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result.length;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async clearReadNotifications(userId: string): Promise<void> {
    await db.delete(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, true)));
  }

  // Chat Mentions
  async getChatMentions(messageId: string): Promise<ChatMention[]> {
    return await db.select().from(chatMentions)
      .where(eq(chatMentions.messageId, messageId));
  }

  async createChatMention(data: InsertChatMention): Promise<ChatMention> {
    const [created] = await db.insert(chatMentions).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  // Sandbox methods
  async createCompanyWithId(id: string, insertCompany: InsertCompany): Promise<Company> {
    const now = new Date();
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const tier = (insertCompany.subscriptionTier || "essentials") as SubscriptionTier;
    const credits = tierCredits[tier] || 20;

    const [company] = await db.insert(companies).values({
      id,
      ...insertCompany,
      credits,
      monthlyCredits: credits,
      renewalDate: formatDateShortET(firstOfNextMonth),
      createdAt: now.toISOString(),
    }).returning();
    return company;
  }

  async createUserWithId(id: string, data: { email: string; password: string; firstName: string; lastName: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      id,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    }).returning();
    return user;
  }

  async deleteSandboxData(companyId: string): Promise<void> {
    // Delete tasks for this company
    await db.delete(tasks).where(eq(tasks.companyId, companyId));
    
    // Delete credit transactions
    await db.delete(creditTransactions).where(eq(creditTransactions.companyId, companyId));
    
    // Delete chat messages and threads
    const threads = await db.select().from(chatThreads).where(eq(chatThreads.companyId, companyId));
    for (const thread of threads) {
      await db.delete(chatMessages).where(eq(chatMessages.threadId, thread.id));
      await db.delete(chatThreadMembers).where(eq(chatThreadMembers.threadId, thread.id));
      await db.delete(chatReadReceipts).where(eq(chatReadReceipts.threadId, thread.id));
    }
    await db.delete(chatThreads).where(eq(chatThreads.companyId, companyId));
    
    // Delete campaign requests
    await db.delete(campaignRequests).where(eq(campaignRequests.companyId, companyId));
    
    // Delete meeting requests
    await db.delete(meetingRequests).where(eq(meetingRequests.companyId, companyId));
    
    // Delete media uploads
    await db.delete(mediaUploads).where(eq(mediaUploads.companyId, companyId));
    
    // Delete notifications for sandbox users
    const members = await db.select().from(companyMembers).where(eq(companyMembers.companyId, companyId));
    for (const member of members) {
      await db.delete(notifications).where(eq(notifications.userId, member.userId));
    }
  }

  async deleteClientOnboarding(companyId: string): Promise<void> {
    await db.delete(clientOnboarding).where(eq(clientOnboarding.companyId, companyId));
  }

  async getChatThreads(companyId: string): Promise<ChatThread[]> {
    return await db.select().from(chatThreads)
      .where(eq(chatThreads.companyId, companyId))
      .orderBy(desc(chatThreads.createdAt));
  }

  // Government Documents
  async getGovernmentDocuments(companyId: string): Promise<GovernmentDocument[]> {
    return await db.select().from(governmentDocuments)
      .where(eq(governmentDocuments.companyId, companyId))
      .orderBy(desc(governmentDocuments.createdAt));
  }

  async getGovernmentDocument(id: string): Promise<GovernmentDocument | undefined> {
    const [doc] = await db.select().from(governmentDocuments)
      .where(eq(governmentDocuments.id, id));
    return doc;
  }

  async createGovernmentDocument(doc: InsertGovernmentDocument): Promise<GovernmentDocument> {
    const [created] = await db.insert(governmentDocuments).values({
      ...doc,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateGovernmentDocument(id: string, data: Partial<GovernmentDocument>): Promise<GovernmentDocument | undefined> {
    const [updated] = await db.update(governmentDocuments)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(governmentDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteGovernmentDocument(id: string): Promise<void> {
    await db.delete(governmentDocuments).where(eq(governmentDocuments.id, id));
  }

  async getExpiredGovernmentDocuments(): Promise<GovernmentDocument[]> {
    const now = new Date().toISOString();
    return await db.select().from(governmentDocuments)
      .where(
        and(
          eq(governmentDocuments.status, "signed"),
          lt(governmentDocuments.expiresAt, now),
          isNull(governmentDocuments.localFileDeletedAt)
        )
      );
  }

  // ============= Signing Packets =============
  async getSigningPackets(companyId: string): Promise<SigningPacket[]> {
    return await db.select().from(signingPackets)
      .where(eq(signingPackets.companyId, companyId))
      .orderBy(desc(signingPackets.createdAt));
  }

  async getSigningPacket(id: string): Promise<SigningPacket | undefined> {
    const [packet] = await db.select().from(signingPackets)
      .where(eq(signingPackets.id, id));
    return packet;
  }

  async createSigningPacket(packet: InsertSigningPacket): Promise<SigningPacket> {
    const [created] = await db.insert(signingPackets).values({
      ...packet,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateSigningPacket(id: string, data: Partial<SigningPacket>): Promise<SigningPacket | undefined> {
    const [updated] = await db.update(signingPackets)
      .set(data)
      .where(eq(signingPackets.id, id))
      .returning();
    return updated;
  }

  async deleteSigningPacket(id: string): Promise<void> {
    await db.delete(signingPackets).where(eq(signingPackets.id, id));
  }

  // ============= Signing Participants =============
  async getSigningParticipants(packetId: string): Promise<SigningParticipant[]> {
    return await db.select().from(signingParticipants)
      .where(eq(signingParticipants.packetId, packetId));
  }

  async getSigningParticipant(id: string): Promise<SigningParticipant | undefined> {
    const [participant] = await db.select().from(signingParticipants)
      .where(eq(signingParticipants.id, id));
    return participant;
  }

  async getSigningParticipantByToken(tokenHash: string): Promise<SigningParticipant | undefined> {
    const [participant] = await db.select().from(signingParticipants)
      .where(eq(signingParticipants.accessToken, tokenHash));
    return participant;
  }

  async createSigningParticipant(participant: InsertSigningParticipant): Promise<SigningParticipant> {
    const [created] = await db.insert(signingParticipants).values({
      ...participant,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateSigningParticipant(id: string, data: Partial<SigningParticipant>): Promise<SigningParticipant | undefined> {
    const [updated] = await db.update(signingParticipants)
      .set(data)
      .where(eq(signingParticipants.id, id))
      .returning();
    return updated;
  }

  // ============= Signing Events =============
  async getSigningEvents(packetId: string): Promise<SigningEvent[]> {
    return await db.select().from(signingEvents)
      .where(eq(signingEvents.packetId, packetId))
      .orderBy(desc(signingEvents.createdAt));
  }

  async createSigningEvent(event: InsertSigningEvent): Promise<SigningEvent> {
    const [created] = await db.insert(signingEvents).values({
      ...event,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  // ============= Signing Fields =============
  async getSigningFields(packetId: string): Promise<SigningField[]> {
    return await db.select().from(signingFields)
      .where(eq(signingFields.packetId, packetId));
  }

  async getSigningField(id: string): Promise<SigningField | undefined> {
    const [field] = await db.select().from(signingFields)
      .where(eq(signingFields.id, id));
    return field;
  }

  async createSigningField(field: InsertSigningField): Promise<SigningField> {
    const [created] = await db.insert(signingFields).values({
      ...field,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateSigningField(id: string, data: Partial<SigningField>): Promise<SigningField | undefined> {
    const [updated] = await db.update(signingFields)
      .set(data)
      .where(eq(signingFields.id, id))
      .returning();
    return updated;
  }

  async deleteSigningField(id: string): Promise<void> {
    await db.delete(signingFields).where(eq(signingFields.id, id));
  }

  async deleteSigningFieldsByPacketId(packetId: string): Promise<void> {
    await db.delete(signingFields).where(eq(signingFields.packetId, packetId));
  }

  // Media Profiles
  async getMediaProfiles(): Promise<MediaProfile[]> {
    return await db.select().from(mediaProfiles).orderBy(desc(mediaProfiles.createdAt));
  }

  async getMediaProfile(id: string): Promise<MediaProfile | undefined> {
    const [profile] = await db.select().from(mediaProfiles).where(eq(mediaProfiles.id, id));
    return profile;
  }

  async createMediaProfile(profile: InsertMediaProfile): Promise<MediaProfile> {
    const [created] = await db.insert(mediaProfiles).values({
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateMediaProfile(id: string, data: Partial<MediaProfile>): Promise<MediaProfile | undefined> {
    const [updated] = await db.update(mediaProfiles)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(mediaProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteMediaProfile(id: string): Promise<void> {
    await db.delete(mediaProfiles).where(eq(mediaProfiles.id, id));
  }

  // Media Profile Fields
  async getMediaProfileFields(profileId: string): Promise<MediaProfileField[]> {
    return await db.select().from(mediaProfileFields)
      .where(eq(mediaProfileFields.profileId, profileId))
      .orderBy(mediaProfileFields.sortOrder);
  }

  async getMediaProfileField(id: string): Promise<MediaProfileField | undefined> {
    const [field] = await db.select().from(mediaProfileFields).where(eq(mediaProfileFields.id, id));
    return field;
  }

  async createMediaProfileField(field: InsertMediaProfileField): Promise<MediaProfileField> {
    const [created] = await db.insert(mediaProfileFields).values({
      ...field,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateMediaProfileField(id: string, data: Partial<MediaProfileField>): Promise<MediaProfileField | undefined> {
    const [updated] = await db.update(mediaProfileFields)
      .set(data)
      .where(eq(mediaProfileFields.id, id))
      .returning();
    return updated;
  }

  async deleteMediaProfileField(id: string): Promise<void> {
    await db.delete(mediaProfileFields).where(eq(mediaProfileFields.id, id));
  }

  async deleteMediaProfileFieldsByProfileId(profileId: string): Promise<void> {
    await db.delete(mediaProfileFields).where(eq(mediaProfileFields.profileId, profileId));
  }

  // Company Media Profiles
  async getCompanyMediaProfiles(companyId: string): Promise<CompanyMediaProfile[]> {
    return await db.select().from(companyMediaProfiles)
      .where(eq(companyMediaProfiles.companyId, companyId));
  }

  async getMediaProfileCompanies(profileId: string): Promise<CompanyMediaProfile[]> {
    return await db.select().from(companyMediaProfiles)
      .where(eq(companyMediaProfiles.profileId, profileId));
  }

  async assignMediaProfileToCompany(assignment: InsertCompanyMediaProfile): Promise<CompanyMediaProfile> {
    const [created] = await db.insert(companyMediaProfiles).values({
      ...assignment,
      assignedAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async unassignMediaProfileFromCompany(companyId: string, profileId: string): Promise<void> {
    await db.delete(companyMediaProfiles).where(
      and(
        eq(companyMediaProfiles.companyId, companyId),
        eq(companyMediaProfiles.profileId, profileId)
      )
    );
  }

  // Media Submissions
  async getMediaSubmissions(companyId: string): Promise<MediaSubmission[]> {
    return await db.select().from(mediaSubmissions)
      .where(eq(mediaSubmissions.companyId, companyId))
      .orderBy(desc(mediaSubmissions.createdAt));
  }

  async getAllMediaSubmissions(): Promise<MediaSubmission[]> {
    return await db.select().from(mediaSubmissions).orderBy(desc(mediaSubmissions.createdAt));
  }

  async getMediaSubmission(id: string): Promise<MediaSubmission | undefined> {
    const [submission] = await db.select().from(mediaSubmissions).where(eq(mediaSubmissions.id, id));
    return submission;
  }

  async createMediaSubmission(submission: InsertMediaSubmission): Promise<MediaSubmission> {
    const [created] = await db.insert(mediaSubmissions).values({
      ...submission,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateMediaSubmission(id: string, data: Partial<MediaSubmission>): Promise<MediaSubmission | undefined> {
    const [updated] = await db.update(mediaSubmissions)
      .set(data)
      .where(eq(mediaSubmissions.id, id))
      .returning();
    return updated;
  }

  // Media Submission Files
  async getMediaSubmissionFile(id: string): Promise<MediaSubmissionFile | undefined> {
    const [file] = await db.select().from(mediaSubmissionFiles)
      .where(eq(mediaSubmissionFiles.id, id));
    return file;
  }

  async getMediaSubmissionFiles(submissionId: string): Promise<MediaSubmissionFile[]> {
    return await db.select().from(mediaSubmissionFiles)
      .where(eq(mediaSubmissionFiles.submissionId, submissionId));
  }

  async createMediaSubmissionFile(file: InsertMediaSubmissionFile): Promise<MediaSubmissionFile> {
    const [created] = await db.insert(mediaSubmissionFiles).values({
      ...file,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateMediaSubmissionFile(id: string, data: Partial<MediaSubmissionFile>): Promise<MediaSubmissionFile | undefined> {
    const [updated] = await db.update(mediaSubmissionFiles)
      .set(data)
      .where(eq(mediaSubmissionFiles.id, id))
      .returning();
    return updated;
  }

  // Custom Roles
  async getCustomRoles(): Promise<CustomRole[]> {
    return await db.select().from(customRoles).orderBy(desc(customRoles.createdAt));
  }

  async getCustomRole(id: string): Promise<CustomRole | undefined> {
    const [role] = await db.select().from(customRoles).where(eq(customRoles.id, id));
    return role;
  }

  async createCustomRole(role: InsertCustomRole): Promise<CustomRole> {
    const [created] = await db.insert(customRoles).values({
      ...role,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateCustomRole(id: string, data: Partial<CustomRole>): Promise<CustomRole | undefined> {
    const [updated] = await db.update(customRoles)
      .set(data)
      .where(eq(customRoles.id, id))
      .returning();
    return updated;
  }

  async deleteCustomRole(id: string): Promise<void> {
    await db.delete(customRoles).where(eq(customRoles.id, id));
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | undefined> {
    const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return prefs;
  }

  async upsertNotificationPreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(userId);
    if (existing) {
      const [updated] = await db.update(notificationPreferences)
        .set(prefs)
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(notificationPreferences).values({
      ...prefs,
      userId,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }
  async getCadences(companyId: string): Promise<Cadence[]> {
    return db.select().from(cadences).where(eq(cadences.companyId, companyId)).orderBy(desc(cadences.createdAt));
  }

  async getAllActiveCadences(): Promise<Cadence[]> {
    return db.select().from(cadences).where(eq(cadences.isActive, true));
  }

  async getCadence(id: string): Promise<Cadence | undefined> {
    const [cadence] = await db.select().from(cadences).where(eq(cadences.id, id));
    return cadence;
  }

  async createCadence(cadence: InsertCadence): Promise<Cadence> {
    const [created] = await db.insert(cadences).values({
      ...cadence,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateCadence(id: string, data: Partial<Cadence>): Promise<Cadence | undefined> {
    const [updated] = await db.update(cadences).set(data).where(eq(cadences.id, id)).returning();
    return updated;
  }

  async deleteCadence(id: string): Promise<boolean> {
    const result = await db.delete(cadences).where(eq(cadences.id, id)).returning();
    return result.length > 0;
  }

  async getSubscriptionTierDefinitions(): Promise<SubscriptionTierDefinition[]> {
    return await db.select().from(subscriptionTierDefinitions).orderBy(subscriptionTierDefinitions.sortOrder);
  }

  async getSubscriptionTierDefinition(id: string): Promise<SubscriptionTierDefinition | undefined> {
    const [tier] = await db.select().from(subscriptionTierDefinitions).where(eq(subscriptionTierDefinitions.id, id));
    return tier;
  }

  async getSubscriptionTierDefinitionByKey(key: string): Promise<SubscriptionTierDefinition | undefined> {
    const [tier] = await db.select().from(subscriptionTierDefinitions).where(eq(subscriptionTierDefinitions.key, key));
    return tier;
  }

  async createSubscriptionTierDefinition(data: InsertSubscriptionTierDefinition): Promise<SubscriptionTierDefinition> {
    const [created] = await db.insert(subscriptionTierDefinitions).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async updateSubscriptionTierDefinition(id: string, data: Partial<SubscriptionTierDefinition>): Promise<SubscriptionTierDefinition | undefined> {
    const [updated] = await db.update(subscriptionTierDefinitions).set(data).where(eq(subscriptionTierDefinitions.id, id)).returning();
    return updated;
  }

  async getMonthlyReportNote(companyId: string, month: number, year: number): Promise<MonthlyReportNote | undefined> {
    const [note] = await db.select().from(monthlyReportNotes)
      .where(and(
        eq(monthlyReportNotes.companyId, companyId),
        eq(monthlyReportNotes.month, month),
        eq(monthlyReportNotes.year, year)
      ));
    return note;
  }

  async getMonthlyReportNotesByMonth(month: number, year: number): Promise<MonthlyReportNote[]> {
    return db.select().from(monthlyReportNotes)
      .where(and(
        eq(monthlyReportNotes.month, month),
        eq(monthlyReportNotes.year, year)
      ));
  }

  async upsertMonthlyReportNote(data: InsertMonthlyReportNote): Promise<MonthlyReportNote> {
    const now = new Date().toISOString();
    const existing = await this.getMonthlyReportNote(data.companyId, data.month, data.year);
    if (existing) {
      const [updated] = await db.update(monthlyReportNotes)
        .set({ notes: data.notes, updatedAt: now })
        .where(eq(monthlyReportNotes.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(monthlyReportNotes)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
