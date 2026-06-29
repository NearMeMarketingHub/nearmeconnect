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
  type CompanyCredential,
  type InsertCompanyCredential,
  type CompanyKnowledgeItem,
  type InsertCompanyKnowledgeItem,
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
  companyCredentials,
  companyKnowledgeItems,
  hubspotConnections,
  brandProfiles,
  contentPillars,
  contentAssets,
  contentCalendarItems,
  contentCalendarActivity,
  type HubspotConnection,
  type BrandProfile,
  type ContentPillar,
  type InsertContentPillar,
  type ContentAsset,
  type InsertContentAsset,
  type ContentCalendarItem,
  type InsertContentCalendarItem,
  type ContentCalendarActivity,
  type InsertContentCalendarActivity,
  hubspotOnboardingChecklist,
  type HubspotOnboardingItem,
  hubspotSyncLog,
  type HubspotSyncLog,
  reportPresets,
  type ReportPreset,
  type InsertReportPreset,
  aiPromptTemplates,
  type AiPromptTemplate,
  type InsertAiPromptTemplate,
  hubspotWorkflowTemplates,
  type HubspotWorkflowTemplate,
  companyWorkflows,
  type CompanyWorkflow,
  type InsertCompanyWorkflow,
  notepads,
  type Notepad,
  type InsertNotepad,
  messageBoardPosts,
  type MessageBoardPost,
  type InsertMessageBoardPost,
  messageBoardReplies,
  type MessageBoardReply,
  type InsertMessageBoardReply,
  checkinQuestions,
  type CheckinQuestion,
  type InsertCheckinQuestion,
  checkinResponses,
  type CheckinResponse,
  type InsertCheckinResponse,
  hillCharts,
  type HillChart,
  type InsertHillChart,
  clientResources,
  type ClientResource,
  type InsertClientResource,
  seoDirectories,
  type SeoDirectory,
  type InsertSeoDirectory,
  integrationStatuses,
  type IntegrationStatus,
  type InsertIntegrationStatus,
  emailLogs,
  type EmailLog,
  type InsertEmailLog,
  retainerTemplates,
  type RetainerTemplate,
  type InsertRetainerTemplate,
  serviceTracks,
  type ServiceTrack,
  type InsertServiceTrack,
  retainerTemplateServiceTracks,
  type RetainerTemplateServiceTrack,
  type InsertRetainerTemplateServiceTrack,
  taskTemplates,
  type TaskTemplate,
  type InsertTaskTemplate,
  retainerTemplateTaskTemplates,
  type RetainerTemplateTaskTemplate,
  clientRetainerAssignments,
  type ClientRetainerAssignment,
  type InsertClientRetainerAssignment,
  clientRetainerServiceTracks,
  type ClientRetainerServiceTrack,
  retainerGeneratedTasks,
  type RetainerGeneratedTask,
  type InsertRetainerGeneratedTask,
  creditReservations,
  type CreditReservation,
  type InsertCreditReservation,
  onboardingTemplates,
  type OnboardingTemplate,
  type InsertOnboardingTemplate,
  onboardingTaskTemplates,
  type OnboardingTaskTemplate,
  type InsertOnboardingTaskTemplate,
  systemSettings,
  retainerGenerationLogs,
  type RetainerGenerationLog,
  type InsertRetainerGenerationLog,
  type StrategyBoard,
  type CompanyServiceConfig,
  type InsertCompanyServiceConfig,
  type CompanyProfile,
  type InsertCompanyProfile,
  type GovernmentProfile,
  type InsertGovernmentProfile,
  type GovernmentPortal,
  type InsertGovernmentPortal,
} from "@shared/schema";
import { strategyBoards, companyServiceConfig, companyProfiles, governmentProfiles, governmentPortals } from "@shared/schema";
import { HUBSPOT_CHECKLIST_MASTER } from "@shared/hubspot-checklist";
import { db } from "./db";
import { eq, desc, and, ne, isNull, isNotNull, gt, lt, sql, inArray, or } from "drizzle-orm";
import { formatDateShortET } from "./timezone";

export type AdminUserWithProfile = AdminUser & {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type CompanyMemberWithProfile = CompanyMember & {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUsersByIds(ids: string[]): Promise<User[]>;

  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined>;

  getCompanyServiceConfig(companyId: string): Promise<CompanyServiceConfig | null>;
  upsertCompanyServiceConfig(companyId: string, data: Partial<InsertCompanyServiceConfig>): Promise<CompanyServiceConfig>;

  getCompanyProfile(companyId: string): Promise<CompanyProfile | null>;
  upsertCompanyProfile(companyId: string, data: Partial<InsertCompanyProfile>): Promise<CompanyProfile>;

  getGovernmentProfile(companyId: string): Promise<GovernmentProfile | null>;
  upsertGovernmentProfile(companyId: string, data: Partial<InsertGovernmentProfile>): Promise<GovernmentProfile>;
  getGovernmentPortals(companyId: string): Promise<GovernmentPortal[]>;
  createGovernmentPortal(data: InsertGovernmentPortal): Promise<GovernmentPortal>;
  updateGovernmentPortal(id: string, data: Partial<InsertGovernmentPortal>): Promise<GovernmentPortal | undefined>;
  deleteGovernmentPortal(id: string): Promise<void>;

  getCompanyMember(userId: string, companyId: string): Promise<CompanyMember | undefined>;
  getCompanyMembers(companyId: string): Promise<CompanyMember[]>;
  getCompanyMembership(companyId: string, userId: string): Promise<CompanyMember | undefined>;
  getCompanyMemberById(userId: string): Promise<CompanyMemberWithProfile | undefined>;
  getUserCompanies(userId: string): Promise<CompanyMember[]>;
  createCompanyMember(member: InsertCompanyMember): Promise<CompanyMember>;
  deleteCompanyMember(id: string): Promise<void>;
  updateCompanyMemberRole(id: string, role: string, customRoleId?: string | null): Promise<CompanyMember>;

  isAdmin(userId: string): Promise<boolean>;
  getAdminUser(userId: string): Promise<AdminUserWithProfile | undefined>;
  getAllAdminUsers(): Promise<AdminUserWithProfile[]>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  deleteAdminUser(userId: string): Promise<void>;
  updateUserName(userId: string, firstName: string, lastName: string): Promise<void>;

  getAdminInvitation(token: string): Promise<AdminInvitation | undefined>;
  getAdminInvitationByEmail(email: string): Promise<AdminInvitation | undefined>;
  getAdminInvitations(): Promise<AdminInvitation[]>;
  createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation>;
  markAdminInvitationUsed(token: string, userId: string): Promise<void>;
  deleteAdminInvitation(id: string): Promise<void>;

  getAllTaskCategories(): Promise<TaskCategory[]>;
  getGlobalTaskCategories(): Promise<TaskCategory[]>;
  getTaskCategories(companyId: string): Promise<TaskCategory[]>;
  getTaskCategory(id: string): Promise<TaskCategory | undefined>;
  createTaskCategory(category: InsertTaskCategory): Promise<TaskCategory>;
  updateTaskCategory(id: string, data: Partial<TaskCategory>): Promise<TaskCategory | undefined>;
  deleteTaskCategory(id: string): Promise<void>;
  seedGlobalTaskCategories(): Promise<void>;

  getTasks(companyId: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  getTasksByCampaignRequest(campaignRequestId: string): Promise<Task[]>;
  getSubtasks(parentTaskId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  getStrategyBoard(companyId: string): Promise<StrategyBoard | undefined>;
  upsertStrategyBoard(companyId: string, data: { snapshot?: unknown; notes?: string | null }, updatedBy: string): Promise<StrategyBoard>;
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
  getUserTagAssignmentsForUsers(userIds: string[]): Promise<UserTagAssignment[]>;
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

  // Notepads
  getNotepads(companyId: string, isAdmin?: boolean): Promise<Notepad[]>;
  getNotepad(id: string): Promise<Notepad | undefined>;
  createNotepad(data: InsertNotepad): Promise<Notepad>;
  updateNotepad(id: string, data: Partial<InsertNotepad>): Promise<Notepad | undefined>;
  deleteNotepad(id: string): Promise<void>;

  // Message Board
  getMessageBoardPosts(companyId: string, isAdmin?: boolean): Promise<MessageBoardPost[]>;
  getMessageBoardPost(id: string): Promise<MessageBoardPost | undefined>;
  createMessageBoardPost(data: InsertMessageBoardPost): Promise<MessageBoardPost>;
  updateMessageBoardPost(id: string, data: Partial<InsertMessageBoardPost>): Promise<MessageBoardPost | undefined>;
  deleteMessageBoardPost(id: string): Promise<void>;
  getMessageBoardReplies(postId: string): Promise<MessageBoardReply[]>;
  createMessageBoardReply(data: InsertMessageBoardReply): Promise<MessageBoardReply>;
  deleteMessageBoardReply(id: string): Promise<void>;
  incrementReplyCount(postId: string): Promise<void>;

  // Check-ins
  getCheckinQuestions(): Promise<CheckinQuestion[]>;
  getCheckinQuestion(id: string): Promise<CheckinQuestion | undefined>;
  createCheckinQuestion(data: InsertCheckinQuestion): Promise<CheckinQuestion>;
  updateCheckinQuestion(id: string, data: Partial<InsertCheckinQuestion>): Promise<CheckinQuestion | undefined>;
  deleteCheckinQuestion(id: string): Promise<void>;
  getCheckinResponses(questionId: string): Promise<CheckinResponse[]>;
  createCheckinResponse(data: InsertCheckinResponse): Promise<CheckinResponse>;
  getUserCheckinResponse(questionId: string, responderId: string): Promise<CheckinResponse | undefined>;

  // SEO Directories
  getSeoDirectories(companyId: string): Promise<SeoDirectory[]>;
  getAllSeoDirectories(): Promise<SeoDirectory[]>;
  getSeoDirectory(id: string): Promise<SeoDirectory | undefined>;
  createSeoDirectory(data: InsertSeoDirectory): Promise<SeoDirectory>;
  updateSeoDirectory(id: string, data: Partial<InsertSeoDirectory>): Promise<SeoDirectory | undefined>;
  deleteSeoDirectory(id: string): Promise<void>;

  // Hill Charts
  getHillCharts(companyId: string): Promise<HillChart[]>;
  getHillChart(id: string): Promise<HillChart | undefined>;
  createHillChart(data: InsertHillChart): Promise<HillChart>;
  updateHillChart(id: string, data: Partial<InsertHillChart>): Promise<HillChart | undefined>;
  deleteHillChart(id: string): Promise<void>;

  // Integration Health
  getIntegrationStatuses(companyId: string): Promise<IntegrationStatus[]>;
  getAllIntegrationStatuses(): Promise<IntegrationStatus[]>;
  getIntegrationStatus(id: string): Promise<IntegrationStatus | undefined>;
  upsertIntegrationStatus(companyId: string, integrationType: string, data: Partial<InsertIntegrationStatus> & { updatedBy: string }): Promise<IntegrationStatus>;
  updateIntegrationStatus(id: string, data: Partial<IntegrationStatus>): Promise<IntegrationStatus | undefined>;
  deleteIntegrationStatus(id: string): Promise<void>;

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

  // Company Credentials (admin-managed)
  getCompanyCredentials(companyId: string): Promise<(CompanyCredential & { hasPassword: boolean })[]>;
  getCompanyCredential(id: string): Promise<CompanyCredential | undefined>;
  getCompanyCredentialDecrypted(id: string): Promise<string | null>;
  createCompanyCredential(data: InsertCompanyCredential): Promise<CompanyCredential>;
  updateCompanyCredential(id: string, data: Partial<CompanyCredential>): Promise<CompanyCredential | undefined>;
  deleteCompanyCredential(id: string): Promise<void>;

  // Company Knowledge Items (admin-managed)
  getCompanyKnowledgeItems(companyId: string): Promise<CompanyKnowledgeItem[]>;
  getCompanyKnowledgeItem(id: string): Promise<CompanyKnowledgeItem | undefined>;
  createCompanyKnowledgeItem(data: InsertCompanyKnowledgeItem): Promise<CompanyKnowledgeItem>;
  updateCompanyKnowledgeItem(id: string, data: Partial<CompanyKnowledgeItem>): Promise<CompanyKnowledgeItem | undefined>;
  deleteCompanyKnowledgeItem(id: string): Promise<void>;

  // Brand Profiles
  getBrandProfile(companyId: string): Promise<BrandProfile | undefined>;
  upsertBrandProfile(companyId: string, data: Partial<BrandProfile>): Promise<BrandProfile>;

  // HubSpot OAuth connections
  getHubspotConnection(companyId: string): Promise<HubspotConnection | undefined>;
  getAllActiveHubspotConnections(): Promise<HubspotConnection[]>;
  upsertHubspotConnection(data: Omit<HubspotConnection, "id">): Promise<HubspotConnection>;
  updateHubspotConnection(companyId: string, data: Partial<HubspotConnection>): Promise<void>;
  updateTaskHubspotId(taskId: string, hubspotTaskId: string): Promise<void>;

  // Content Calendar
  getContentPillars(companyId?: string): Promise<ContentPillar[]>;
  createContentPillar(data: InsertContentPillar): Promise<ContentPillar>;
  updateContentPillar(id: string, data: Partial<ContentPillar>): Promise<ContentPillar | undefined>;
  deleteContentPillar(id: string): Promise<void>;
  getContentAssets(companyId?: string, pillarId?: string): Promise<ContentAsset[]>;
  createContentAsset(data: InsertContentAsset): Promise<ContentAsset>;
  deleteContentAsset(id: string): Promise<void>;
  getContentCalendarItems(filters: { companyId?: string; month?: number; year?: number; platform?: string; status?: string; campaignRequestId?: string }): Promise<ContentCalendarItem[]>;
  getContentCalendarItem(id: string): Promise<ContentCalendarItem | undefined>;
  createContentCalendarItem(data: InsertContentCalendarItem): Promise<ContentCalendarItem>;
  updateContentCalendarItem(id: string, data: Partial<ContentCalendarItem>): Promise<ContentCalendarItem | undefined>;
  deleteContentCalendarItem(id: string): Promise<void>;
  bulkCreateContentCalendarItems(items: InsertContentCalendarItem[]): Promise<ContentCalendarItem[]>;
  getContentCalendarActivity(calendarItemId: string): Promise<ContentCalendarActivity[]>;
  createContentCalendarActivity(data: InsertContentCalendarActivity): Promise<ContentCalendarActivity>;
  getContentCalendarReadiness(daysAhead?: number): Promise<Array<{ companyId: string; companyName: string; count30: number; count60: number; approvedCampaigns: number; activeCadences: number }>>;

  // HubSpot Onboarding Checklist
  getHubspotOnboardingChecklist(companyId: string): Promise<HubspotOnboardingItem[]>;
  seedHubspotOnboardingChecklist(companyId: string): Promise<void>;
  updateHubspotOnboardingItem(id: string, data: Partial<HubspotOnboardingItem>): Promise<HubspotOnboardingItem | undefined>;

  // HubSpot Sync Log
  createHubspotSyncLog(data: { companyId: string; action: string; status: string; details?: string }): Promise<HubspotSyncLog>;
  getHubspotSyncLog(companyId: string, limit?: number): Promise<HubspotSyncLog[]>;

  getReportPresets(createdBy?: string): Promise<ReportPreset[]>;
  createReportPreset(data: InsertReportPreset): Promise<ReportPreset>;
  updateReportPreset(id: string, data: Partial<ReportPreset>): Promise<ReportPreset | undefined>;
  deleteReportPreset(id: string): Promise<void>;

  // AI Prompt Templates
  getAiPromptTemplates(): Promise<AiPromptTemplate[]>;
  getAiPromptTemplateByGoal(contentGoal: string): Promise<AiPromptTemplate | undefined>;
  createAiPromptTemplate(data: InsertAiPromptTemplate): Promise<AiPromptTemplate>;
  updateAiPromptTemplate(id: string, data: Partial<InsertAiPromptTemplate>): Promise<AiPromptTemplate | undefined>;
  deleteAiPromptTemplate(id: string): Promise<void>;

  // Workflow Library
  getWorkflowTemplates(filters?: { category?: string; hub?: string; complexity?: string; search?: string }): Promise<HubspotWorkflowTemplate[]>;
  getWorkflowTemplate(id: string): Promise<HubspotWorkflowTemplate | undefined>;
  assignWorkflowsToCompanies(templateId: string, companyIds: string[], assignedBy?: string): Promise<CompanyWorkflow[]>;
  getCompanyWorkflows(companyId: string): Promise<(CompanyWorkflow & { template: HubspotWorkflowTemplate })[]>;
  updateCompanyWorkflow(id: string, data: Partial<Pick<InsertCompanyWorkflow, 'status' | 'hubspotWorkflowId' | 'notes'>>): Promise<CompanyWorkflow | undefined>;
  deleteCompanyWorkflow(id: string): Promise<void>;

  // Client Resources
  getClientResources(companyId: string, filters?: { resourceType?: string; status?: string; visibility?: string }): Promise<ClientResource[]>;
  getAllClientResources(filters?: { companyId?: string; resourceType?: string; status?: string; visibility?: string }): Promise<ClientResource[]>;
  getClientResource(id: string): Promise<ClientResource | undefined>;
  createClientResource(data: InsertClientResource): Promise<ClientResource>;
  updateClientResource(id: string, data: Partial<InsertClientResource>): Promise<ClientResource | undefined>;
  deleteClientResource(id: string): Promise<void>;

  // Email Logs
  getEmailLogs(companyId: string, filters?: { templateType?: string; status?: string; relatedTaskId?: string; relatedCampaignId?: string; relatedMeetingId?: string }): Promise<EmailLog[]>;
  getAllEmailLogs(filters?: { templateType?: string; status?: string }): Promise<EmailLog[]>;
  getEmailLog(id: string): Promise<EmailLog | undefined>;
  getEmailLogByIdempotencyKey(key: string): Promise<EmailLog | undefined>;
  createEmailLog(data: InsertEmailLog): Promise<EmailLog>;
  updateEmailLog(id: string, data: Partial<EmailLog>): Promise<EmailLog | undefined>;
  deleteEmailLog(id: string): Promise<void>;

  // Retainer Templates
  getRetainerTemplates(): Promise<RetainerTemplate[]>;
  getRetainerTemplate(id: string): Promise<RetainerTemplate | undefined>;
  createRetainerTemplate(data: InsertRetainerTemplate): Promise<RetainerTemplate>;
  updateRetainerTemplate(id: string, data: Partial<RetainerTemplate>): Promise<RetainerTemplate | undefined>;
  deleteRetainerTemplate(id: string): Promise<void>;
  getRetainerTemplateServiceTracks(templateId: string): Promise<(RetainerTemplateServiceTrack & { track: ServiceTrack })[]>;
  setRetainerTemplateServiceTracks(templateId: string, entries: { serviceTrackId: string; includedByDefault: boolean }[]): Promise<void>;

  // Service Tracks
  getServiceTracks(): Promise<ServiceTrack[]>;
  getServiceTrack(id: string): Promise<ServiceTrack | undefined>;
  createServiceTrack(data: InsertServiceTrack): Promise<ServiceTrack>;
  updateServiceTrack(id: string, data: Partial<ServiceTrack>): Promise<ServiceTrack | undefined>;
  deleteServiceTrack(id: string): Promise<void>;

  // Task Templates
  getTaskTemplates(filters?: { serviceTrackId?: string; isActive?: boolean }): Promise<TaskTemplate[]>;
  getTaskTemplate(id: string): Promise<TaskTemplate | undefined>;
  createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: string, data: Partial<TaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: string): Promise<void>;
  getRetainerTemplateTaskTemplates(retainerTemplateId: string): Promise<(RetainerTemplateTaskTemplate & { template: TaskTemplate })[]>;
  setRetainerTemplateTaskTemplates(retainerTemplateId: string, entries: Omit<RetainerTemplateTaskTemplate, "id" | "retainerTemplateId">[]): Promise<void>;
  getTaskTemplateRetainerLinks(taskTemplateId: string): Promise<RetainerTemplateTaskTemplate[]>;
  // Client Retainer Assignments
  getClientRetainerAssignment(companyId: string): Promise<ClientRetainerAssignment | undefined>;
  createClientRetainerAssignment(data: InsertClientRetainerAssignment): Promise<ClientRetainerAssignment>;
  updateClientRetainerAssignment(id: string, data: Partial<ClientRetainerAssignment>): Promise<ClientRetainerAssignment | undefined>;
  getClientRetainerServiceTracks(assignmentId: string): Promise<(ClientRetainerServiceTrack & { track: ServiceTrack })[]>;
  setClientRetainerServiceTracks(assignmentId: string, tracks: { serviceTrackId: string; isActive: boolean; notes?: string | null }[]): Promise<void>;
  // Onboarding Templates
  getOnboardingTemplates(): Promise<OnboardingTemplate[]>;
  getOnboardingTemplate(id: string): Promise<OnboardingTemplate | undefined>;
  createOnboardingTemplate(data: InsertOnboardingTemplate): Promise<OnboardingTemplate>;
  updateOnboardingTemplate(id: string, data: Partial<OnboardingTemplate>): Promise<OnboardingTemplate | undefined>;
  deleteOnboardingTemplate(id: string): Promise<void>;
  getOnboardingTaskTemplates(onboardingTemplateId: string): Promise<OnboardingTaskTemplate[]>;
  createOnboardingTaskTemplate(data: InsertOnboardingTaskTemplate): Promise<OnboardingTaskTemplate>;
  updateOnboardingTaskTemplate(id: string, data: Partial<OnboardingTaskTemplate>): Promise<OnboardingTaskTemplate | undefined>;
  deleteOnboardingTaskTemplate(id: string): Promise<void>;
  // Retainer Generated Task History
  createRetainerGeneratedTask(data: InsertRetainerGeneratedTask): Promise<RetainerGeneratedTask>;
  getRetainerGeneratedTaskByDedup(companyId: string, taskTemplateId: string, periodStart: string): Promise<RetainerGeneratedTask | undefined>;
  getRetainerGeneratedTasksByPeriod(companyId: string, periodStart: string, periodEnd: string): Promise<RetainerGeneratedTask[]>;
  // Credit Reservations
  createCreditReservation(data: InsertCreditReservation): Promise<CreditReservation>;
  getCreditReservationByTaskId(generatedTaskId: string): Promise<CreditReservation | undefined>;
  getCreditReservationsByCompany(companyId: string, status?: string): Promise<CreditReservation[]>;
  updateCreditReservation(id: string, data: Partial<CreditReservation>): Promise<CreditReservation | undefined>;
  getCreditProjection(companyId: string): Promise<{ monthlyAllowance: number; usedCredits: number; reservedCredits: number; remainingCredits: number; hasOverage: boolean }>;
  // Auto-generation helpers
  getAllActiveRetainerAssignments(): Promise<ClientRetainerAssignment[]>;
  // System Settings
  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;
  // Retainer Generation Logs
  createRetainerGenerationLog(data: InsertRetainerGenerationLog): Promise<RetainerGenerationLog>;
  getRetainerGenerationLogs(limit?: number): Promise<RetainerGenerationLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return await db.select().from(users).where(inArray(users.id, ids));
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

  async getCompanyServiceConfig(companyId: string): Promise<CompanyServiceConfig | null> {
    const [row] = await db
      .select()
      .from(companyServiceConfig)
      .where(eq(companyServiceConfig.companyId, companyId));
    return row ?? null;
  }

  async upsertCompanyServiceConfig(companyId: string, data: Partial<InsertCompanyServiceConfig>): Promise<CompanyServiceConfig> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(companyServiceConfig)
      .values({ companyId, ...data, updatedAt: now })
      .onConflictDoUpdate({
        target: companyServiceConfig.companyId,
        set: { ...data, updatedAt: now },
      })
      .returning();
    return row;
  }

  async getCompanyProfile(companyId: string): Promise<CompanyProfile | null> {
    const [row] = await db.select().from(companyProfiles).where(eq(companyProfiles.companyId, companyId));
    return row ?? null;
  }

  async upsertCompanyProfile(companyId: string, data: Partial<InsertCompanyProfile>): Promise<CompanyProfile> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(companyProfiles)
      .values({ companyId, ...data, updatedAt: now })
      .onConflictDoUpdate({ target: companyProfiles.companyId, set: { ...data, updatedAt: now } })
      .returning();
    return row;
  }

  async getGovernmentProfile(companyId: string): Promise<GovernmentProfile | null> {
    const [row] = await db.select().from(governmentProfiles).where(eq(governmentProfiles.companyId, companyId));
    return row ?? null;
  }

  async upsertGovernmentProfile(companyId: string, data: Partial<InsertGovernmentProfile>): Promise<GovernmentProfile> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(governmentProfiles)
      .values({ companyId, ...data, updatedAt: now })
      .onConflictDoUpdate({ target: governmentProfiles.companyId, set: { ...data, updatedAt: now } })
      .returning();
    return row;
  }

  async getGovernmentPortals(companyId: string): Promise<GovernmentPortal[]> {
    return await db.select().from(governmentPortals)
      .where(eq(governmentPortals.companyId, companyId))
      .orderBy(governmentPortals.sortOrder, governmentPortals.createdAt);
  }

  async createGovernmentPortal(data: InsertGovernmentPortal): Promise<GovernmentPortal> {
    const [row] = await db.insert(governmentPortals)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning();
    return row;
  }

  async updateGovernmentPortal(id: string, data: Partial<InsertGovernmentPortal>): Promise<GovernmentPortal | undefined> {
    const [row] = await db.update(governmentPortals).set(data).where(eq(governmentPortals.id, id)).returning();
    return row;
  }

  async deleteGovernmentPortal(id: string): Promise<void> {
    await db.delete(governmentPortals).where(eq(governmentPortals.id, id));
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

  async getCompanyMemberById(userId: string): Promise<CompanyMemberWithProfile | undefined> {
    const [result] = await db
      .select({
        id: companyMembers.id,
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
        role: companyMembers.role,
        customRoleId: companyMembers.customRoleId,
        createdAt: companyMembers.createdAt,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(companyMembers)
      .innerJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.userId, userId));
    return result;
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

  async getAdminUser(userId: string): Promise<AdminUserWithProfile | undefined> {
    const [result] = await db
      .select({
        id: adminUsers.id,
        userId: adminUsers.userId,
        createdAt: adminUsers.createdAt,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(adminUsers)
      .innerJoin(users, eq(adminUsers.userId, users.id))
      .where(eq(adminUsers.userId, userId));
    return result;
  }

  async getAllAdminUsers(): Promise<AdminUserWithProfile[]> {
    return await db
      .select({
        id: adminUsers.id,
        userId: adminUsers.userId,
        createdAt: adminUsers.createdAt,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(adminUsers)
      .innerJoin(users, eq(adminUsers.userId, users.id));
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

  async updateUserName(userId: string, firstName: string, lastName: string): Promise<void> {
    await db.update(users).set({ firstName, lastName }).where(eq(users.id, userId));
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

  async getAllTaskCategories(): Promise<TaskCategory[]> {
    return await db.select().from(taskCategories).orderBy(taskCategories.companyId, taskCategories.sortOrder);
  }

  async getGlobalTaskCategories(): Promise<TaskCategory[]> {
    return await db
      .select()
      .from(taskCategories)
      .where(eq(taskCategories.isGlobal, true))
      .orderBy(taskCategories.sortOrder);
  }

  async getTaskCategories(companyId: string): Promise<TaskCategory[]> {
    return await db
      .select()
      .from(taskCategories)
      .where(or(eq(taskCategories.companyId, companyId), eq(taskCategories.isGlobal, true)))
      .orderBy(taskCategories.sortOrder);
  }

  async seedGlobalTaskCategories(): Promise<void> {
    const existing = await db.select().from(taskCategories).where(eq(taskCategories.isGlobal, true));
    if (existing.length > 0) return;
    const defaults = [
      { name: "Content Writing",   color: "#6366f1", icon: "FileText",   description: "Blog posts, copy, articles" },
      { name: "Graphic Design",    color: "#f59e0b", icon: "Image",      description: "Visual assets and design work" },
      { name: "Video Production",  color: "#ef4444", icon: "Video",      description: "Video creation and editing" },
      { name: "SEO & Research",    color: "#10b981", icon: "Search",     description: "Search optimization and market research" },
      { name: "Social Media",      color: "#3b82f6", icon: "Share",      description: "Social posts and campaigns" },
      { name: "Google Business",   color: "#4285f4", icon: "MapPin",     description: "Google Business Profile management" },
      { name: "Email Marketing",   color: "#f97316", icon: "Mail",       description: "Email campaigns and newsletters" },
      { name: "Web Updates",       color: "#8b5cf6", icon: "Globe",      description: "Website changes and maintenance" },
      { name: "Strategy",          color: "#06b6d4", icon: "Zap",        description: "Planning and strategic direction" },
      { name: "Admin & Reporting", color: "#6b7280", icon: "BarChart3",  description: "Reporting, admin, and operations" },
      { name: "Client Review",     color: "#ec4899", icon: "CheckCircle", description: "Client feedback and approvals" },
      { name: "Meetings",          color: "#14b8a6", icon: "Users",      description: "Calls, check-ins, and meetings" },
    ];
    const now = formatDateShortET(new Date());
    await db.insert(taskCategories).values(
      defaults.map((d, i) => ({ ...d, isGlobal: true, sortOrder: i, createdAt: now }))
    );
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

  async getTasksByCampaignRequest(campaignRequestId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.campaignRequestId, campaignRequestId));
  }

  async getSubtasks(parentTaskId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId))
      .orderBy(tasks.sortOrder);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getStrategyBoard(companyId: string): Promise<StrategyBoard | undefined> {
    const [row] = await db.select().from(strategyBoards).where(eq(strategyBoards.companyId, companyId));
    return row;
  }

  async upsertStrategyBoard(companyId: string, data: { snapshot?: unknown; notes?: string | null }, updatedBy: string): Promise<StrategyBoard> {
    const now = new Date().toISOString();
    const existing = await this.getStrategyBoard(companyId);
    const patch: any = { updatedAt: now, updatedBy };
    if (data.snapshot !== undefined) patch.snapshot = data.snapshot as any;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (existing) {
      const [row] = await db.update(strategyBoards)
        .set(patch)
        .where(eq(strategyBoards.companyId, companyId))
        .returning();
      return row;
    }
    const [row] = await db.insert(strategyBoards)
      .values({
        companyId,
        snapshot: (data.snapshot ?? null) as any,
        notes: data.notes ?? null,
        updatedAt: now,
        updatedBy,
      })
      .returning();
    return row;
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
    // Delete subtasks first (recursively clean up their own related data)
    const subtasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.parentTaskId, id));
    for (const sub of subtasks) {
      await this.deleteTask(sub.id);
    }

    // Delete object-storage attachments
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

    // Clear nextTaskId on any tasks that point to this one
    await db.update(tasks).set({ nextTaskId: null }).where(eq(tasks.nextTaskId, id));

    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, id));
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

  async getUserTagAssignmentsForUsers(userIds: string[]): Promise<UserTagAssignment[]> {
    if (userIds.length === 0) return [];
    return await db.select().from(userTagAssignments)
      .where(inArray(userTagAssignments.userId, userIds));
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

  async getCompanyCredentials(companyId: string): Promise<(CompanyCredential & { hasPassword: boolean })[]> {
    const rows = await db.select().from(companyCredentials)
      .where(eq(companyCredentials.companyId, companyId))
      .orderBy(companyCredentials.createdAt);
    // Compute hasPassword from real DB value before stripping it
    return rows.map(r => ({ ...r, password: null, hasPassword: r.password !== null && r.password.length > 0 }));
  }

  async getCompanyCredential(id: string): Promise<CompanyCredential | undefined> {
    const [row] = await db.select().from(companyCredentials).where(eq(companyCredentials.id, id));
    return row;
  }

  async getCompanyCredentialDecrypted(id: string): Promise<string | null> {
    const { encryptSecret, decryptSecret, isEncrypted } = await import("./lib/credential-encryption");
    const [row] = await db.select().from(companyCredentials).where(eq(companyCredentials.id, id));
    if (!row || !row.password) return null;
    const stored = row.password;
    if (!isEncrypted(stored)) {
      // Legacy plaintext — encrypt it now (transparent migration) then return plaintext
      try {
        const encrypted = encryptSecret(stored);
        await db.update(companyCredentials)
          .set({ password: encrypted, updatedAt: new Date().toISOString() })
          .where(eq(companyCredentials.id, id));
        console.info(`[credential-encryption] Migrated plaintext credential ${id} to encrypted form`);
      } catch (err) {
        // Migration failed — the plaintext is still returned to the caller so the
        // admin can see the value, but we surface the failure clearly so it isn't
        // silently left as plaintext forever.
        console.error(`[credential-encryption] Migration failed for credential ${id} — plaintext remains in DB until next reveal:`, err);
      }
      return stored;
    }
    return decryptSecret(stored);
  }

  async createCompanyCredential(data: InsertCompanyCredential): Promise<CompanyCredential> {
    const { encryptSecret, encryptionAvailable } = await import("./lib/credential-encryption");
    let encryptedPassword = data.password;
    if (encryptedPassword) {
      if (!encryptionAvailable()) {
        throw new Error("CREDENTIAL_ENCRYPTION_KEY is not set — cannot store credential password at rest");
      }
      encryptedPassword = encryptSecret(encryptedPassword);
    }
    const [row] = await db.insert(companyCredentials).values({
      ...data,
      password: encryptedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    // Return with password stripped (never expose encrypted blob or plaintext)
    return { ...row, password: null };
  }

  async updateCompanyCredential(id: string, data: Partial<CompanyCredential>): Promise<CompanyCredential | undefined> {
    const { encryptSecret, encryptionAvailable } = await import("./lib/credential-encryption");
    let updateData = { ...data };
    if (updateData.password) {
      if (!encryptionAvailable()) {
        throw new Error("CREDENTIAL_ENCRYPTION_KEY is not set — cannot store credential password at rest");
      }
      updateData.password = encryptSecret(updateData.password);
    }
    const [row] = await db.update(companyCredentials)
      .set({ ...updateData, updatedAt: new Date().toISOString() })
      .where(eq(companyCredentials.id, id))
      .returning();
    if (!row) return undefined;
    // Return with password stripped
    return { ...row, password: null };
  }

  async deleteCompanyCredential(id: string): Promise<void> {
    await db.delete(companyCredentials).where(eq(companyCredentials.id, id));
  }

  async getCompanyKnowledgeItems(companyId: string): Promise<CompanyKnowledgeItem[]> {
    return db.select().from(companyKnowledgeItems)
      .where(eq(companyKnowledgeItems.companyId, companyId))
      .orderBy(companyKnowledgeItems.section, companyKnowledgeItems.sortOrder, companyKnowledgeItems.createdAt);
  }

  async getCompanyKnowledgeItem(id: string): Promise<CompanyKnowledgeItem | undefined> {
    const [row] = await db.select().from(companyKnowledgeItems).where(eq(companyKnowledgeItems.id, id));
    return row;
  }

  async createCompanyKnowledgeItem(data: InsertCompanyKnowledgeItem): Promise<CompanyKnowledgeItem> {
    const [row] = await db.insert(companyKnowledgeItems).values({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    return row;
  }

  async updateCompanyKnowledgeItem(id: string, data: Partial<CompanyKnowledgeItem>): Promise<CompanyKnowledgeItem | undefined> {
    const [row] = await db.update(companyKnowledgeItems)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(companyKnowledgeItems.id, id))
      .returning();
    return row;
  }

  async deleteCompanyKnowledgeItem(id: string): Promise<void> {
    await db.delete(companyKnowledgeItems).where(eq(companyKnowledgeItems.id, id));
  }

  async getBrandProfile(companyId: string): Promise<BrandProfile | undefined> {
    const [row] = await db.select().from(brandProfiles).where(eq(brandProfiles.companyId, companyId));
    return row;
  }

  async upsertBrandProfile(companyId: string, data: Partial<BrandProfile>): Promise<BrandProfile> {
    const existing = await this.getBrandProfile(companyId);
    if (existing) {
      const [updated] = await db.update(brandProfiles)
        .set({ ...data, companyId, updatedAt: new Date().toISOString() })
        .where(eq(brandProfiles.companyId, companyId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(brandProfiles)
        .values({ ...data, companyId, createdAt: new Date().toISOString() })
        .returning();
      return created;
    }
  }

  async getHubspotConnection(companyId: string): Promise<HubspotConnection | undefined> {
    const [conn] = await db.select().from(hubspotConnections)
      .where(eq(hubspotConnections.companyId, companyId));
    return conn;
  }

  async upsertHubspotConnection(data: Omit<HubspotConnection, "id">): Promise<HubspotConnection> {
    const now = new Date().toISOString();
    const [conn] = await db.insert(hubspotConnections)
      .values({ ...data, connectedAt: data.connectedAt || now })
      .onConflictDoUpdate({
        target: hubspotConnections.companyId,
        set: {
          portalId: data.portalId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          hubDomain: data.hubDomain,
          hubspotCompanyId: data.hubspotCompanyId,
          scopesGranted: data.scopesGranted,
          connectedBy: data.connectedBy,
          lastSyncedAt: data.lastSyncedAt,
          isActive: data.isActive,
        },
      })
      .returning();
    return conn;
  }

  async getAllActiveHubspotConnections(): Promise<HubspotConnection[]> {
    return db.select().from(hubspotConnections)
      .where(eq(hubspotConnections.isActive, true));
  }

  async updateHubspotConnection(companyId: string, data: Partial<HubspotConnection>): Promise<void> {
    await db.update(hubspotConnections)
      .set(data)
      .where(eq(hubspotConnections.companyId, companyId));
  }

  async updateTaskHubspotId(taskId: string, hubspotTaskId: string): Promise<void> {
    await db.update(tasks).set({ hubspotTaskId } as any).where(eq(tasks.id, taskId));
  }

  // ── Content Calendar ──────────────────────────────────────────────────────

  async getContentPillars(companyId?: string): Promise<ContentPillar[]> {
    const q = db.select().from(contentPillars).orderBy(contentPillars.sortOrder, contentPillars.name);
    if (companyId) return q.where(eq(contentPillars.companyId, companyId));
    return q;
  }

  async createContentPillar(data: InsertContentPillar): Promise<ContentPillar> {
    const [row] = await db.insert(contentPillars).values({ ...data, createdAt: new Date().toISOString() }).returning();
    return row;
  }

  async updateContentPillar(id: string, data: Partial<ContentPillar>): Promise<ContentPillar | undefined> {
    const [row] = await db.update(contentPillars).set(data).where(eq(contentPillars.id, id)).returning();
    return row;
  }

  async deleteContentPillar(id: string): Promise<void> {
    await db.delete(contentPillars).where(eq(contentPillars.id, id));
  }

  async getContentAssets(companyId?: string, pillarId?: string): Promise<ContentAsset[]> {
    const conditions: any[] = [];
    if (companyId) conditions.push(eq(contentAssets.companyId, companyId));
    if (pillarId) conditions.push(eq(contentAssets.pillarId, pillarId));
    const q = db.select().from(contentAssets).orderBy(desc(contentAssets.createdAt));
    if (conditions.length) return q.where(and(...conditions));
    return q;
  }

  async createContentAsset(data: InsertContentAsset): Promise<ContentAsset> {
    const [row] = await db.insert(contentAssets).values({ ...data, createdAt: new Date().toISOString() }).returning();
    return row;
  }

  async deleteContentAsset(id: string): Promise<void> {
    await db.delete(contentAssets).where(eq(contentAssets.id, id));
  }

  async getContentCalendarItems(filters: { companyId?: string; month?: number; year?: number; platform?: string; status?: string; campaignRequestId?: string }): Promise<ContentCalendarItem[]> {
    const conditions = [];
    if (filters.companyId) conditions.push(eq(contentCalendarItems.companyId, filters.companyId));
    if (filters.platform) conditions.push(eq(contentCalendarItems.platform, filters.platform as any));
    if (filters.status) conditions.push(eq(contentCalendarItems.status, filters.status as any));
    if (filters.campaignRequestId) conditions.push(eq(contentCalendarItems.campaignRequestId, filters.campaignRequestId));
    if (filters.month !== undefined && filters.year !== undefined) {
      const prefix = `${filters.year}-${String(filters.month).padStart(2, "0")}-`;
      conditions.push(sql`${contentCalendarItems.scheduledDate} LIKE ${prefix + "%"}`);
    }
    const q = db.select().from(contentCalendarItems);
    if (conditions.length > 0) {
      return q.where(and(...conditions)).orderBy(contentCalendarItems.scheduledDate, contentCalendarItems.scheduledTime);
    }
    return q.orderBy(contentCalendarItems.scheduledDate, contentCalendarItems.scheduledTime);
  }

  async getContentCalendarItem(id: string): Promise<ContentCalendarItem | undefined> {
    const [row] = await db.select().from(contentCalendarItems).where(eq(contentCalendarItems.id, id));
    return row;
  }

  async createContentCalendarItem(data: InsertContentCalendarItem): Promise<ContentCalendarItem> {
    const now = new Date().toISOString();
    const [row] = await db.insert(contentCalendarItems).values({ ...data, createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateContentCalendarItem(id: string, data: Partial<ContentCalendarItem>): Promise<ContentCalendarItem | undefined> {
    const [row] = await db.update(contentCalendarItems)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(contentCalendarItems.id, id))
      .returning();
    return row;
  }

  async deleteContentCalendarItem(id: string): Promise<void> {
    await db.delete(contentCalendarItems).where(eq(contentCalendarItems.id, id));
  }

  async bulkCreateContentCalendarItems(items: InsertContentCalendarItem[]): Promise<ContentCalendarItem[]> {
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    const rows = await db.insert(contentCalendarItems)
      .values(items.map(item => ({ ...item, createdAt: now, updatedAt: now })))
      .returning();
    return rows;
  }

  async getContentCalendarActivity(calendarItemId: string): Promise<ContentCalendarActivity[]> {
    return db.select().from(contentCalendarActivity)
      .where(eq(contentCalendarActivity.calendarItemId, calendarItemId))
      .orderBy(desc(contentCalendarActivity.createdAt));
  }

  async createContentCalendarActivity(data: InsertContentCalendarActivity): Promise<ContentCalendarActivity> {
    const [row] = await db.insert(contentCalendarActivity).values({ ...data, createdAt: new Date().toISOString() }).returning();
    return row;
  }

  async getContentCalendarReadiness(): Promise<Array<{ companyId: string; companyName: string; count30: number; count60: number; approvedCampaigns: number; activeCadences: number }>> {
    const now = new Date();
    const d30 = new Date(now); d30.setDate(d30.getDate() + 30);
    const d60 = new Date(now); d60.setDate(d60.getDate() + 60);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const todayStr = fmt(now);
    const d30Str = fmt(d30);
    const d60Str = fmt(d60);

    const allCompanies = await db.select().from(companies).orderBy(companies.name);
    const results = [];
    for (const company of allCompanies) {
      const items30 = await db.select().from(contentCalendarItems)
        .where(and(
          eq(contentCalendarItems.companyId, company.id),
          sql`${contentCalendarItems.scheduledDate} >= ${todayStr}`,
          sql`${contentCalendarItems.scheduledDate} <= ${d30Str}`,
          sql`${contentCalendarItems.status} NOT IN ('cancelled','archived')`
        ));
      const items60 = await db.select().from(contentCalendarItems)
        .where(and(
          eq(contentCalendarItems.companyId, company.id),
          sql`${contentCalendarItems.scheduledDate} > ${d30Str}`,
          sql`${contentCalendarItems.scheduledDate} <= ${d60Str}`,
          sql`${contentCalendarItems.status} NOT IN ('cancelled','archived')`
        ));
      const approvedCampaignRows = await db.select().from(campaignRequests)
        .where(and(eq(campaignRequests.companyId, company.id), eq(campaignRequests.status, "approved")));
      const activeCadenceRows = await db.select().from(cadences)
        .where(and(eq(cadences.companyId, company.id), eq(cadences.isActive, true)));
      results.push({
        companyId: company.id,
        companyName: company.name,
        count30: items30.length,
        count60: items60.length,
        approvedCampaigns: approvedCampaignRows.length,
        activeCadences: activeCadenceRows.length,
      });
    }
    return results;
  }

  // ── HubSpot Onboarding Checklist ──────────────────────────────────────────

  async getHubspotOnboardingChecklist(companyId: string): Promise<HubspotOnboardingItem[]> {
    return db.select().from(hubspotOnboardingChecklist)
      .where(eq(hubspotOnboardingChecklist.companyId, companyId))
      .orderBy(hubspotOnboardingChecklist.sortOrder);
  }

  async seedHubspotOnboardingChecklist(companyId: string): Promise<void> {
    let sortOrder = 0;
    const items = HUBSPOT_CHECKLIST_MASTER.flatMap(({ section, items }) =>
      items.map(({ key, label }) => ({
        companyId,
        section,
        itemKey: key,
        label,
        isCompleted: false,
        sortOrder: sortOrder++,
        createdAt: new Date().toISOString(),
      }))
    );
    await db.insert(hubspotOnboardingChecklist).values(items);
  }

  async updateHubspotOnboardingItem(id: string, data: Partial<HubspotOnboardingItem>): Promise<HubspotOnboardingItem | undefined> {
    const [row] = await db.update(hubspotOnboardingChecklist)
      .set(data)
      .where(eq(hubspotOnboardingChecklist.id, id))
      .returning();
    return row;
  }

  // ── HubSpot Sync Log ──────────────────────────────────────────────────────

  async createHubspotSyncLog(data: { companyId: string; action: string; status: string; details?: string }): Promise<HubspotSyncLog> {
    const [row] = await db.insert(hubspotSyncLog).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
    return row;
  }

  async getHubspotSyncLog(companyId: string, limit = 50): Promise<HubspotSyncLog[]> {
    return db.select().from(hubspotSyncLog)
      .where(eq(hubspotSyncLog.companyId, companyId))
      .orderBy(desc(hubspotSyncLog.createdAt))
      .limit(limit);
  }

  async getReportPresets(createdBy?: string): Promise<ReportPreset[]> {
    if (createdBy) {
      return db.select().from(reportPresets).where(eq(reportPresets.createdBy, createdBy)).orderBy(desc(reportPresets.createdAt));
    }
    return db.select().from(reportPresets).orderBy(desc(reportPresets.createdAt));
  }

  async createReportPreset(data: InsertReportPreset): Promise<ReportPreset> {
    const [preset] = await db.insert(reportPresets).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
    return preset;
  }

  async updateReportPreset(id: string, data: Partial<ReportPreset>): Promise<ReportPreset | undefined> {
    const [preset] = await db.update(reportPresets).set(data).where(eq(reportPresets.id, id)).returning();
    return preset;
  }

  async deleteReportPreset(id: string): Promise<void> {
    await db.delete(reportPresets).where(eq(reportPresets.id, id));
  }

  // ── AI Prompt Templates ───────────────────────────────────────────────────

  async getAiPromptTemplates(): Promise<AiPromptTemplate[]> {
    return db.select().from(aiPromptTemplates).orderBy(aiPromptTemplates.contentGoal, aiPromptTemplates.name);
  }

  async getAiPromptTemplateByGoal(contentGoal: string): Promise<AiPromptTemplate | undefined> {
    const rows = await db.select().from(aiPromptTemplates)
      .where(and(eq(aiPromptTemplates.contentGoal, contentGoal as any), eq(aiPromptTemplates.isActive, true)))
      .orderBy(desc(aiPromptTemplates.isDefault))
      .limit(1);
    return rows[0];
  }

  async createAiPromptTemplate(data: InsertAiPromptTemplate): Promise<AiPromptTemplate> {
    const now = new Date().toISOString();
    const [tmpl] = await db.insert(aiPromptTemplates).values({ ...data, contentGoal: data.contentGoal as any, createdAt: now }).returning();
    return tmpl;
  }

  async updateAiPromptTemplate(id: string, data: Partial<InsertAiPromptTemplate>): Promise<AiPromptTemplate | undefined> {
    const payload: Record<string, any> = { ...data, updatedAt: new Date().toISOString() };
    const [tmpl] = await db.update(aiPromptTemplates)
      .set(payload)
      .where(eq(aiPromptTemplates.id, id))
      .returning();
    return tmpl;
  }

  async deleteAiPromptTemplate(id: string): Promise<void> {
    await db.delete(aiPromptTemplates).where(eq(aiPromptTemplates.id, id));
  }

  // ── Workflow Library ──────────────────────────────────────────────────────
  async getWorkflowTemplates(filters?: { category?: string; hub?: string; complexity?: string; search?: string }): Promise<HubspotWorkflowTemplate[]> {
    let q = db.select().from(hubspotWorkflowTemplates).$dynamic();
    const conds = [];
    if (filters?.category) conds.push(eq(hubspotWorkflowTemplates.category, filters.category));
    if (filters?.complexity) conds.push(eq(hubspotWorkflowTemplates.complexity, filters.complexity as any));
    if (filters?.hub) conds.push(sql`${hubspotWorkflowTemplates.hub} ilike ${'%' + filters.hub + '%'}`);
    if (filters?.search) conds.push(sql`${hubspotWorkflowTemplates.name} ilike ${'%' + filters.search + '%'}`);
    if (conds.length) q = q.where(and(...conds));
    return q.orderBy(hubspotWorkflowTemplates.sortOrder);
  }

  async getWorkflowTemplate(id: string): Promise<HubspotWorkflowTemplate | undefined> {
    const [row] = await db.select().from(hubspotWorkflowTemplates).where(eq(hubspotWorkflowTemplates.id, id));
    return row;
  }

  async assignWorkflowsToCompanies(templateId: string, companyIds: string[], assignedBy?: string): Promise<CompanyWorkflow[]> {
    const now = new Date().toISOString();
    const results: CompanyWorkflow[] = [];
    for (const companyId of companyIds) {
      const [existing] = await db.select().from(companyWorkflows).where(
        and(eq(companyWorkflows.templateId, templateId), eq(companyWorkflows.companyId, companyId))
      );
      if (existing) { results.push(existing); continue; }
      const [row] = await db.insert(companyWorkflows).values({ companyId, templateId, status: 'planned', assignedBy, createdAt: now }).returning();
      results.push(row);
    }
    return results;
  }

  async getCompanyWorkflows(companyId: string): Promise<(CompanyWorkflow & { template: HubspotWorkflowTemplate })[]> {
    const rows = await db
      .select({ cw: companyWorkflows, t: hubspotWorkflowTemplates })
      .from(companyWorkflows)
      .innerJoin(hubspotWorkflowTemplates, eq(companyWorkflows.templateId, hubspotWorkflowTemplates.id))
      .where(eq(companyWorkflows.companyId, companyId))
      .orderBy(hubspotWorkflowTemplates.sortOrder);
    return rows.map(r => ({ ...r.cw, template: r.t }));
  }

  async updateCompanyWorkflow(id: string, data: Partial<Pick<InsertCompanyWorkflow, 'status' | 'hubspotWorkflowId' | 'notes'>>): Promise<CompanyWorkflow | undefined> {
    const [row] = await db.update(companyWorkflows)
      .set({ status: data.status as any, hubspotWorkflowId: data.hubspotWorkflowId, notes: data.notes, updatedAt: new Date().toISOString() })
      .where(eq(companyWorkflows.id, id))
      .returning();
    return row;
  }

  async deleteCompanyWorkflow(id: string): Promise<void> {
    await db.delete(companyWorkflows).where(eq(companyWorkflows.id, id));
  }

  // ── Notepads ────────────────────────────────────────────────────────────────

  async getNotepads(companyId: string, isAdmin = true): Promise<Notepad[]> {
    const condition = isAdmin
      ? eq(notepads.companyId, companyId)
      : and(eq(notepads.companyId, companyId), eq(notepads.isInternal, false));
    return db.select().from(notepads).where(condition).orderBy(notepads.createdAt);
  }

  async getNotepad(id: string): Promise<Notepad | undefined> {
    const [row] = await db.select().from(notepads).where(eq(notepads.id, id));
    return row;
  }

  async createNotepad(data: InsertNotepad): Promise<Notepad> {
    const now = new Date().toISOString();
    const [row] = await db.insert(notepads).values({ ...data, createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateNotepad(id: string, data: Partial<InsertNotepad>): Promise<Notepad | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(notepads).set({ ...data, updatedAt: now }).where(eq(notepads.id, id)).returning();
    return row;
  }

  async deleteNotepad(id: string): Promise<void> {
    await db.delete(notepads).where(eq(notepads.id, id));
  }

  // ── Message Board ────────────────────────────────────────────────────────────

  async getMessageBoardPosts(companyId: string, isAdmin = true): Promise<MessageBoardPost[]> {
    const condition = isAdmin
      ? eq(messageBoardPosts.companyId, companyId)
      : and(eq(messageBoardPosts.companyId, companyId), eq(messageBoardPosts.isInternal, false));
    return db.select().from(messageBoardPosts).where(condition).orderBy(messageBoardPosts.createdAt);
  }

  async getMessageBoardPost(id: string): Promise<MessageBoardPost | undefined> {
    const [row] = await db.select().from(messageBoardPosts).where(eq(messageBoardPosts.id, id));
    return row;
  }

  async createMessageBoardPost(data: InsertMessageBoardPost): Promise<MessageBoardPost> {
    const now = new Date().toISOString();
    const [row] = await db.insert(messageBoardPosts).values({ ...data, replyCount: 0, createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateMessageBoardPost(id: string, data: Partial<InsertMessageBoardPost>): Promise<MessageBoardPost | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(messageBoardPosts).set({ ...data, updatedAt: now }).where(eq(messageBoardPosts.id, id)).returning();
    return row;
  }

  async deleteMessageBoardPost(id: string): Promise<void> {
    await db.delete(messageBoardReplies).where(eq(messageBoardReplies.postId, id));
    await db.delete(messageBoardPosts).where(eq(messageBoardPosts.id, id));
  }

  async getMessageBoardReplies(postId: string): Promise<MessageBoardReply[]> {
    return db.select().from(messageBoardReplies).where(eq(messageBoardReplies.postId, postId)).orderBy(messageBoardReplies.createdAt);
  }

  async createMessageBoardReply(data: InsertMessageBoardReply): Promise<MessageBoardReply> {
    const now = new Date().toISOString();
    const [row] = await db.insert(messageBoardReplies).values({ ...data, createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async deleteMessageBoardReply(id: string): Promise<void> {
    await db.delete(messageBoardReplies).where(eq(messageBoardReplies.id, id));
  }

  async incrementReplyCount(postId: string): Promise<void> {
    const [post] = await db.select().from(messageBoardPosts).where(eq(messageBoardPosts.id, postId));
    if (post) {
      await db.update(messageBoardPosts).set({ replyCount: (post.replyCount ?? 0) + 1 }).where(eq(messageBoardPosts.id, postId));
    }
  }

  // ── Check-ins ────────────────────────────────────────────────────────────────

  async getCheckinQuestions(): Promise<CheckinQuestion[]> {
    return db.select().from(checkinQuestions).orderBy(checkinQuestions.createdAt);
  }

  async getCheckinQuestion(id: string): Promise<CheckinQuestion | undefined> {
    const [row] = await db.select().from(checkinQuestions).where(eq(checkinQuestions.id, id));
    return row;
  }

  async createCheckinQuestion(data: InsertCheckinQuestion): Promise<CheckinQuestion> {
    const now = new Date().toISOString();
    const [row] = await db.insert(checkinQuestions).values({ ...data, createdAt: now }).returning();
    return row;
  }

  async updateCheckinQuestion(id: string, data: Partial<InsertCheckinQuestion>): Promise<CheckinQuestion | undefined> {
    const [row] = await db.update(checkinQuestions).set(data).where(eq(checkinQuestions.id, id)).returning();
    return row;
  }

  async deleteCheckinQuestion(id: string): Promise<void> {
    await db.delete(checkinResponses).where(eq(checkinResponses.questionId, id));
    await db.delete(checkinQuestions).where(eq(checkinQuestions.id, id));
  }

  async getCheckinResponses(questionId: string): Promise<CheckinResponse[]> {
    return db.select().from(checkinResponses).where(eq(checkinResponses.questionId, questionId)).orderBy(checkinResponses.respondedAt);
  }

  async createCheckinResponse(data: InsertCheckinResponse): Promise<CheckinResponse> {
    const now = new Date().toISOString();
    const [row] = await db.insert(checkinResponses).values({ ...data, createdAt: now }).returning();
    return row;
  }

  async getUserCheckinResponse(questionId: string, responderId: string): Promise<CheckinResponse | undefined> {
    const [row] = await db.select().from(checkinResponses)
      .where(eq(checkinResponses.questionId, questionId))
      .orderBy(checkinResponses.respondedAt);
    return row?.responderId === responderId ? row : undefined;
  }

  // ── Hill Charts ──────────────────────────────────────────────────────────────

  async getHillCharts(companyId: string): Promise<HillChart[]> {
    return db.select().from(hillCharts).where(eq(hillCharts.companyId, companyId)).orderBy(hillCharts.createdAt);
  }

  async getHillChart(id: string): Promise<HillChart | undefined> {
    const [row] = await db.select().from(hillCharts).where(eq(hillCharts.id, id));
    return row;
  }

  async createHillChart(data: InsertHillChart): Promise<HillChart> {
    const now = new Date().toISOString();
    const [row] = await db.insert(hillCharts).values({ ...data, createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateHillChart(id: string, data: Partial<InsertHillChart>): Promise<HillChart | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(hillCharts).set({ ...data, updatedAt: now }).where(eq(hillCharts.id, id)).returning();
    return row;
  }

  async deleteHillChart(id: string): Promise<void> {
    await db.delete(hillCharts).where(eq(hillCharts.id, id));
  }

  // ── Client Resources ──────────────────────────────────────────────────────────

  async getClientResources(companyId: string, filters?: { resourceType?: string; status?: string; visibility?: string }): Promise<ClientResource[]> {
    const conditions: any[] = [eq(clientResources.companyId, companyId)];
    if (filters?.resourceType) conditions.push(eq(clientResources.resourceType, filters.resourceType as any));
    if (filters?.status) conditions.push(eq(clientResources.status, filters.status as any));
    if (filters?.visibility) conditions.push(eq(clientResources.visibility, filters.visibility as any));
    return db.select().from(clientResources).where(and(...conditions)).orderBy(clientResources.resourceType, clientResources.title);
  }

  async getAllClientResources(filters?: { companyId?: string; resourceType?: string; status?: string; visibility?: string }): Promise<ClientResource[]> {
    const conditions: any[] = [];
    if (filters?.companyId) conditions.push(eq(clientResources.companyId, filters.companyId));
    if (filters?.resourceType) conditions.push(eq(clientResources.resourceType, filters.resourceType as any));
    if (filters?.status) conditions.push(eq(clientResources.status, filters.status as any));
    if (filters?.visibility) conditions.push(eq(clientResources.visibility, filters.visibility as any));
    const q = conditions.length > 0
      ? db.select().from(clientResources).where(and(...conditions))
      : db.select().from(clientResources);
    return q.orderBy(clientResources.companyId, clientResources.resourceType, clientResources.title);
  }

  async getClientResource(id: string): Promise<ClientResource | undefined> {
    const [row] = await db.select().from(clientResources).where(eq(clientResources.id, id));
    return row;
  }

  async getSeoDirectories(companyId: string): Promise<SeoDirectory[]> {
    return db.select().from(seoDirectories).where(eq(seoDirectories.companyId, companyId)).orderBy(seoDirectories.createdAt);
  }

  async getAllSeoDirectories(): Promise<SeoDirectory[]> {
    return db.select().from(seoDirectories).orderBy(seoDirectories.createdAt);
  }

  async getSeoDirectory(id: string): Promise<SeoDirectory | undefined> {
    const [row] = await db.select().from(seoDirectories).where(eq(seoDirectories.id, id));
    return row;
  }

  async createSeoDirectory(data: InsertSeoDirectory): Promise<SeoDirectory> {
    const now = new Date().toISOString();
    const [row] = await db.insert(seoDirectories).values({ ...(data as any), createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateSeoDirectory(id: string, data: Partial<InsertSeoDirectory>): Promise<SeoDirectory | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(seoDirectories).set({ ...(data as any), updatedAt: now }).where(eq(seoDirectories.id, id)).returning();
    return row;
  }

  async deleteSeoDirectory(id: string): Promise<void> {
    await db.delete(seoDirectories).where(eq(seoDirectories.id, id));
  }

  // ── Integration Health ──────────────────────────────────────────────────────
  async getIntegrationStatuses(companyId: string): Promise<IntegrationStatus[]> {
    return db.select().from(integrationStatuses).where(eq(integrationStatuses.companyId, companyId)).orderBy(integrationStatuses.integrationType);
  }

  async getAllIntegrationStatuses(): Promise<IntegrationStatus[]> {
    return db.select().from(integrationStatuses).orderBy(integrationStatuses.companyId, integrationStatuses.integrationType);
  }

  async getIntegrationStatus(id: string): Promise<IntegrationStatus | undefined> {
    const [row] = await db.select().from(integrationStatuses).where(eq(integrationStatuses.id, id));
    return row;
  }

  async upsertIntegrationStatus(companyId: string, integrationType: string, data: Partial<InsertIntegrationStatus> & { updatedBy: string }): Promise<IntegrationStatus> {
    const now = new Date().toISOString();
    const existing = await db.select().from(integrationStatuses)
      .where(and(eq(integrationStatuses.companyId, companyId), eq(integrationStatuses.integrationType, integrationType as any)));
    if (existing.length > 0) {
      const { companyId: _c, integrationType: _t, createdAt: _ca, ...updateData } = data as any;
      const [row] = await db.update(integrationStatuses)
        .set({ ...updateData, updatedAt: now } as any)
        .where(and(eq(integrationStatuses.companyId, companyId), eq(integrationStatuses.integrationType, integrationType as any)))
        .returning();
      return row;
    }
    const [row] = await db.insert(integrationStatuses)
      .values({ ...data, companyId, integrationType: integrationType as any, createdAt: now, updatedAt: now } as any)
      .returning();
    return row;
  }

  async updateIntegrationStatus(id: string, data: Partial<IntegrationStatus>): Promise<IntegrationStatus | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(integrationStatuses).set({ ...data, updatedAt: now }).where(eq(integrationStatuses.id, id)).returning();
    return row;
  }

  async deleteIntegrationStatus(id: string): Promise<void> {
    await db.delete(integrationStatuses).where(eq(integrationStatuses.id, id));
  }

  async createClientResource(data: InsertClientResource): Promise<ClientResource> {
    const now = new Date().toISOString();
    const [row] = await db.insert(clientResources).values({ ...(data as any), createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateClientResource(id: string, data: Partial<InsertClientResource>): Promise<ClientResource | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(clientResources).set({ ...(data as any), updatedAt: now }).where(eq(clientResources.id, id)).returning();
    return row;
  }

  async deleteClientResource(id: string): Promise<void> {
    await db.delete(clientResources).where(eq(clientResources.id, id));
  }

  // ── Email Logs ──────────────────────────────────────────────────────────────

  async getEmailLogs(companyId: string, filters?: { templateType?: string; status?: string; relatedTaskId?: string; relatedCampaignId?: string; relatedMeetingId?: string }): Promise<EmailLog[]> {
    let query = db.select().from(emailLogs).where(eq(emailLogs.companyId, companyId));
    const rows = await query.orderBy(desc(emailLogs.createdAt));
    return rows.filter(r => {
      if (filters?.templateType && r.templateType !== filters.templateType) return false;
      if (filters?.status && r.status !== filters.status) return false;
      if (filters?.relatedTaskId && r.relatedTaskId !== filters.relatedTaskId) return false;
      if (filters?.relatedCampaignId && r.relatedCampaignId !== filters.relatedCampaignId) return false;
      if (filters?.relatedMeetingId && r.relatedMeetingId !== filters.relatedMeetingId) return false;
      return true;
    });
  }

  async getAllEmailLogs(filters?: { templateType?: string; status?: string }): Promise<EmailLog[]> {
    const rows = await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt));
    return rows.filter(r => {
      if (filters?.templateType && r.templateType !== filters.templateType) return false;
      if (filters?.status && r.status !== filters.status) return false;
      return true;
    });
  }

  async getEmailLog(id: string): Promise<EmailLog | undefined> {
    const [row] = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
    return row;
  }

  async getEmailLogByIdempotencyKey(key: string): Promise<EmailLog | undefined> {
    const [row] = await db.select().from(emailLogs).where(eq(emailLogs.idempotencyKey, key));
    return row;
  }

  async createEmailLog(data: InsertEmailLog): Promise<EmailLog> {
    const now = new Date().toISOString();
    const [row] = await db.insert(emailLogs).values({ ...(data as any), createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateEmailLog(id: string, data: Partial<EmailLog>): Promise<EmailLog | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(emailLogs).set({ ...(data as any), updatedAt: now }).where(eq(emailLogs.id, id)).returning();
    return row;
  }

  async deleteEmailLog(id: string): Promise<void> {
    await db.delete(emailLogs).where(eq(emailLogs.id, id));
  }

  // ── Retainer Templates ──────────────────────────────────────────────────────

  async getRetainerTemplates(): Promise<RetainerTemplate[]> {
    return db.select().from(retainerTemplates).orderBy(retainerTemplates.name);
  }

  async getRetainerTemplate(id: string): Promise<RetainerTemplate | undefined> {
    const [row] = await db.select().from(retainerTemplates).where(eq(retainerTemplates.id, id));
    return row;
  }

  async createRetainerTemplate(data: InsertRetainerTemplate): Promise<RetainerTemplate> {
    const now = new Date().toISOString();
    const [row] = await db.insert(retainerTemplates).values({ ...(data as any), createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateRetainerTemplate(id: string, data: Partial<RetainerTemplate>): Promise<RetainerTemplate | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(retainerTemplates).set({ ...(data as any), updatedAt: now }).where(eq(retainerTemplates.id, id)).returning();
    return row;
  }

  async deleteRetainerTemplate(id: string): Promise<void> {
    await db.delete(retainerTemplateServiceTracks).where(eq(retainerTemplateServiceTracks.retainerTemplateId, id));
    await db.delete(retainerTemplates).where(eq(retainerTemplates.id, id));
  }

  async getRetainerTemplateServiceTracks(templateId: string): Promise<(RetainerTemplateServiceTrack & { track: ServiceTrack })[]> {
    const rows = await db
      .select({ join: retainerTemplateServiceTracks, track: serviceTracks })
      .from(retainerTemplateServiceTracks)
      .innerJoin(serviceTracks, eq(retainerTemplateServiceTracks.serviceTrackId, serviceTracks.id))
      .where(eq(retainerTemplateServiceTracks.retainerTemplateId, templateId))
      .orderBy(serviceTracks.sortOrder, serviceTracks.name);
    return rows.map(r => ({ ...r.join, track: r.track }));
  }

  async setRetainerTemplateServiceTracks(templateId: string, entries: { serviceTrackId: string; includedByDefault: boolean }[]): Promise<void> {
    await db.delete(retainerTemplateServiceTracks).where(eq(retainerTemplateServiceTracks.retainerTemplateId, templateId));
    if (entries.length > 0) {
      const now = new Date().toISOString();
      await db.insert(retainerTemplateServiceTracks).values(
        entries.map(e => ({ retainerTemplateId: templateId, serviceTrackId: e.serviceTrackId, includedByDefault: e.includedByDefault }))
      );
    }
  }

  // ── Service Tracks ──────────────────────────────────────────────────────────

  async getServiceTracks(): Promise<ServiceTrack[]> {
    return db.select().from(serviceTracks).orderBy(serviceTracks.sortOrder, serviceTracks.name);
  }

  async getServiceTrack(id: string): Promise<ServiceTrack | undefined> {
    const [row] = await db.select().from(serviceTracks).where(eq(serviceTracks.id, id));
    return row;
  }

  async createServiceTrack(data: InsertServiceTrack): Promise<ServiceTrack> {
    const now = new Date().toISOString();
    const [row] = await db.insert(serviceTracks).values({ ...(data as any), createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateServiceTrack(id: string, data: Partial<ServiceTrack>): Promise<ServiceTrack | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(serviceTracks).set({ ...(data as any), updatedAt: now }).where(eq(serviceTracks.id, id)).returning();
    return row;
  }

  async deleteServiceTrack(id: string): Promise<void> {
    await db.delete(retainerTemplateServiceTracks).where(eq(retainerTemplateServiceTracks.serviceTrackId, id));
    await db.delete(serviceTracks).where(eq(serviceTracks.id, id));
  }

  // ── Task Templates ──────────────────────────────────────────────────────────

  async getTaskTemplates(filters?: { serviceTrackId?: string; isActive?: boolean }): Promise<TaskTemplate[]> {
    let q = db.select().from(taskTemplates).$dynamic();
    if (filters?.serviceTrackId !== undefined) {
      q = q.where(eq(taskTemplates.serviceTrackId, filters.serviceTrackId));
    }
    if (filters?.isActive !== undefined) {
      q = q.where(eq(taskTemplates.isActive, filters.isActive));
    }
    return q.orderBy(taskTemplates.sortOrder, taskTemplates.title);
  }

  async getTaskTemplate(id: string): Promise<TaskTemplate | undefined> {
    const [row] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id));
    return row;
  }

  async createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate> {
    const now = new Date().toISOString();
    const [row] = await db.insert(taskTemplates).values({ ...(data as any), createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateTaskTemplate(id: string, data: Partial<TaskTemplate>): Promise<TaskTemplate | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(taskTemplates).set({ ...(data as any), updatedAt: now }).where(eq(taskTemplates.id, id)).returning();
    return row;
  }

  async deleteTaskTemplate(id: string): Promise<void> {
    await db.delete(retainerTemplateTaskTemplates).where(eq(retainerTemplateTaskTemplates.taskTemplateId, id));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
  }

  async getRetainerTemplateTaskTemplates(retainerTemplateId: string): Promise<(RetainerTemplateTaskTemplate & { template: TaskTemplate })[]> {
    const rows = await db
      .select({ join: retainerTemplateTaskTemplates, template: taskTemplates })
      .from(retainerTemplateTaskTemplates)
      .innerJoin(taskTemplates, eq(retainerTemplateTaskTemplates.taskTemplateId, taskTemplates.id))
      .where(eq(retainerTemplateTaskTemplates.retainerTemplateId, retainerTemplateId))
      .orderBy(taskTemplates.sortOrder, taskTemplates.title);
    return rows.map(r => ({ ...r.join, template: r.template }));
  }

  async setRetainerTemplateTaskTemplates(retainerTemplateId: string, entries: Omit<RetainerTemplateTaskTemplate, "id" | "retainerTemplateId">[]): Promise<void> {
    await db.delete(retainerTemplateTaskTemplates).where(eq(retainerTemplateTaskTemplates.retainerTemplateId, retainerTemplateId));
    if (entries.length > 0) {
      await db.insert(retainerTemplateTaskTemplates).values(
        entries.map(e => ({ ...e, retainerTemplateId }))
      );
    }
  }

  async getTaskTemplateRetainerLinks(taskTemplateId: string): Promise<RetainerTemplateTaskTemplate[]> {
    return db.select().from(retainerTemplateTaskTemplates).where(eq(retainerTemplateTaskTemplates.taskTemplateId, taskTemplateId));
  }

  async getClientRetainerAssignment(companyId: string): Promise<ClientRetainerAssignment | undefined> {
    const [row] = await db.select().from(clientRetainerAssignments)
      .where(eq(clientRetainerAssignments.companyId, companyId))
      .orderBy(desc(clientRetainerAssignments.createdAt))
      .limit(1);
    return row;
  }

  async createClientRetainerAssignment(data: InsertClientRetainerAssignment): Promise<ClientRetainerAssignment> {
    const now = new Date().toISOString();
    const [row] = await db.insert(clientRetainerAssignments).values({ ...(data as any), createdAt: now, updatedAt: now }).returning();
    return row;
  }

  async updateClientRetainerAssignment(id: string, data: Partial<ClientRetainerAssignment>): Promise<ClientRetainerAssignment | undefined> {
    const now = new Date().toISOString();
    const [row] = await db.update(clientRetainerAssignments).set({ ...(data as any), updatedAt: now }).where(eq(clientRetainerAssignments.id, id)).returning();
    return row;
  }

  async getClientRetainerServiceTracks(assignmentId: string): Promise<(ClientRetainerServiceTrack & { track: ServiceTrack })[]> {
    const rows = await db.select({ join: clientRetainerServiceTracks, track: serviceTracks })
      .from(clientRetainerServiceTracks)
      .innerJoin(serviceTracks, eq(clientRetainerServiceTracks.serviceTrackId, serviceTracks.id))
      .where(eq(clientRetainerServiceTracks.clientRetainerAssignmentId, assignmentId));
    return rows.map(r => ({ ...r.join, track: r.track }));
  }

  async setClientRetainerServiceTracks(assignmentId: string, tracks: { serviceTrackId: string; isActive: boolean; notes?: string | null }[]): Promise<void> {
    await db.delete(clientRetainerServiceTracks).where(eq(clientRetainerServiceTracks.clientRetainerAssignmentId, assignmentId));
    if (tracks.length > 0) {
      await db.insert(clientRetainerServiceTracks).values(tracks.map(t => ({
        clientRetainerAssignmentId: assignmentId,
        serviceTrackId: t.serviceTrackId,
        isActive: t.isActive,
        notes: t.notes ?? null,
      })));
    }
  }

  // ── Onboarding Templates ─────────────────────────────────────────────────────

  async getOnboardingTemplates(): Promise<OnboardingTemplate[]> {
    return db.select().from(onboardingTemplates).orderBy(onboardingTemplates.name);
  }

  async getOnboardingTemplate(id: string): Promise<OnboardingTemplate | undefined> {
    const [row] = await db.select().from(onboardingTemplates).where(eq(onboardingTemplates.id, id));
    return row;
  }

  async createOnboardingTemplate(data: InsertOnboardingTemplate): Promise<OnboardingTemplate> {
    const [row] = await db.insert(onboardingTemplates).values({
      ...(data as any),
      createdAt: new Date().toISOString(),
    }).returning();
    return row;
  }

  async updateOnboardingTemplate(id: string, data: Partial<OnboardingTemplate>): Promise<OnboardingTemplate | undefined> {
    const [row] = await db.update(onboardingTemplates)
      .set({ ...data, updatedAt: new Date().toISOString() } as any)
      .where(eq(onboardingTemplates.id, id))
      .returning();
    return row;
  }

  async deleteOnboardingTemplate(id: string): Promise<void> {
    await db.delete(onboardingTaskTemplates).where(eq(onboardingTaskTemplates.onboardingTemplateId, id));
    await db.delete(onboardingTemplates).where(eq(onboardingTemplates.id, id));
  }

  async getOnboardingTaskTemplates(onboardingTemplateId: string): Promise<OnboardingTaskTemplate[]> {
    return db.select().from(onboardingTaskTemplates)
      .where(eq(onboardingTaskTemplates.onboardingTemplateId, onboardingTemplateId))
      .orderBy(onboardingTaskTemplates.sortOrder);
  }

  async createOnboardingTaskTemplate(data: InsertOnboardingTaskTemplate): Promise<OnboardingTaskTemplate> {
    const [row] = await db.insert(onboardingTaskTemplates).values({
      ...(data as any),
      createdAt: new Date().toISOString(),
    }).returning();
    return row;
  }

  async updateOnboardingTaskTemplate(id: string, data: Partial<OnboardingTaskTemplate>): Promise<OnboardingTaskTemplate | undefined> {
    const [row] = await db.update(onboardingTaskTemplates)
      .set(data as any)
      .where(eq(onboardingTaskTemplates.id, id))
      .returning();
    return row;
  }

  async deleteOnboardingTaskTemplate(id: string): Promise<void> {
    await db.delete(onboardingTaskTemplates).where(eq(onboardingTaskTemplates.id, id));
  }

  // ── Retainer Generated Task History ─────────────────────────────────────────

  async createRetainerGeneratedTask(data: InsertRetainerGeneratedTask): Promise<RetainerGeneratedTask> {
    const [row] = await db.insert(retainerGeneratedTasks).values({
      ...(data as any),
      createdAt: new Date().toISOString(),
    }).returning();
    return row;
  }

  async getRetainerGeneratedTaskByDedup(companyId: string, taskTemplateId: string, periodStart: string): Promise<RetainerGeneratedTask | undefined> {
    const [row] = await db.select().from(retainerGeneratedTasks).where(
      and(
        eq(retainerGeneratedTasks.companyId, companyId),
        eq(retainerGeneratedTasks.taskTemplateId, taskTemplateId),
        eq(retainerGeneratedTasks.periodStart, periodStart),
      )
    );
    return row;
  }

  async getRetainerGeneratedTasksByPeriod(companyId: string, periodStart: string, periodEnd: string): Promise<RetainerGeneratedTask[]> {
    return db.select().from(retainerGeneratedTasks).where(
      and(
        eq(retainerGeneratedTasks.companyId, companyId),
        eq(retainerGeneratedTasks.periodStart, periodStart),
        eq(retainerGeneratedTasks.periodEnd, periodEnd),
      )
    );
  }

  // ── Credit Reservations ──────────────────────────────────────────────────────

  async createCreditReservation(data: InsertCreditReservation): Promise<CreditReservation> {
    const [row] = await db.insert(creditReservations).values({
      ...(data as any),
      createdAt: new Date().toISOString(),
    }).returning();
    return row;
  }

  async getCreditReservationByTaskId(generatedTaskId: string): Promise<CreditReservation | undefined> {
    const [row] = await db.select().from(creditReservations).where(eq(creditReservations.generatedTaskId, generatedTaskId));
    return row;
  }

  async getCreditReservationsByCompany(companyId: string, status?: string): Promise<CreditReservation[]> {
    if (status) {
      return db.select().from(creditReservations).where(
        and(eq(creditReservations.companyId, companyId), eq(creditReservations.status, status))
      );
    }
    return db.select().from(creditReservations).where(eq(creditReservations.companyId, companyId));
  }

  async updateCreditReservation(id: string, data: Partial<CreditReservation>): Promise<CreditReservation | undefined> {
    const [row] = await db.update(creditReservations)
      .set({ ...data, updatedAt: new Date().toISOString() } as any)
      .where(eq(creditReservations.id, id))
      .returning();
    return row;
  }

  async getCreditProjection(companyId: string): Promise<{ monthlyAllowance: number; usedCredits: number; reservedCredits: number; remainingCredits: number; hasOverage: boolean }> {
    const company = await this.getCompany(companyId);
    const monthlyAllowance = company?.monthlyCredits ?? 0;
    const currentBalance = company?.credits ?? 0;

    // Used = credits spent this month (monthly allowance minus current balance, clamped to 0)
    const usedCredits = Math.max(0, monthlyAllowance - currentBalance);

    // Reserved = sum of all "reserved" credit reservations for this company
    const reservedRows = await this.getCreditReservationsByCompany(companyId, "reserved");
    const reservedCredits = reservedRows.reduce((sum, r) => sum + parseFloat(r.reservedCredits), 0);

    const remainingCredits = Math.max(0, currentBalance - reservedCredits);
    const hasOverage = (usedCredits + reservedCredits) > monthlyAllowance;

    return { monthlyAllowance, usedCredits, reservedCredits, remainingCredits, hasOverage };
  }

  async getAllActiveRetainerAssignments(): Promise<ClientRetainerAssignment[]> {
    return await db
      .select()
      .from(clientRetainerAssignments)
      .where(
        and(
          eq(clientRetainerAssignments.status, "active"),
          eq(clientRetainerAssignments.autoGenerationEnabled, true),
        ),
      );
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return row?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date().toISOString() },
      });
  }

  async createRetainerGenerationLog(data: InsertRetainerGenerationLog): Promise<RetainerGenerationLog> {
    const [row] = await db
      .insert(retainerGenerationLogs)
      .values({ ...data, createdAt: new Date().toISOString() } as any)
      .returning();
    return row;
  }

  async getRetainerGenerationLogs(limit = 50): Promise<RetainerGenerationLog[]> {
    return await db
      .select()
      .from(retainerGenerationLogs)
      .orderBy(desc(retainerGenerationLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
