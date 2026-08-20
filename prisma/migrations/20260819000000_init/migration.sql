-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "disabledAt" TIMESTAMP(3),
    "disabledBy" TEXT,
    "disabledReason" TEXT,
    "canUploadDocuments" BOOLEAN NOT NULL DEFAULT true,
    "canCreateConversations" BOOLEAN NOT NULL DEFAULT true,
    "canInviteUsers" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL,
    "sourceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "conversationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "tokensInput" INTEGER NOT NULL,
    "tokensOutput" INTEGER NOT NULL,
    "tokensTotal" INTEGER NOT NULL,
    "costUSD" DOUBLE PRECISION NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLimits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dailyTokenLimit" INTEGER,
    "monthlyTokenLimit" INTEGER,
    "dailyRequestLimit" INTEGER,
    "monthlyRequestLimit" INTEGER,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "OrganizationLimits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTokenLimits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyTokenLimit" INTEGER,
    "monthlyTokenLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "UserTokenLimits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUserPermissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canUploadDocuments" BOOLEAN,
    "canCreateConversations" BOOLEAN,
    "canInviteUsers" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUserPermissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvatarUploadLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blobUrl" TEXT,

    CONSTRAINT "AvatarUploadLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCategoryAccess" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCategoryAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSourceCategory" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeSourceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "slackTeamId" TEXT,
    "slackTeamName" TEXT,
    "slackAppId" TEXT,
    "slackClientId" TEXT,
    "slackClientSecret" TEXT,
    "slackSigningSecret" TEXT,
    "slackBotToken" TEXT,
    "slackBotUserId" TEXT,
    "slackBotUserName" TEXT,
    "defaultThread" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackIntegrationCategory" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackIntegrationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackIntegrationLog" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slackTeamId" TEXT,
    "slackChannelId" TEXT,
    "slackChannel" TEXT,
    "slackThreadTs" TEXT,
    "slackUserId" TEXT,
    "slackUserName" TEXT,
    "slackUserEmail" TEXT,
    "organizationUserId" TEXT,
    "organizationUserName" TEXT,
    "organizationUserEmail" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "error" TEXT,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "responseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackIntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackThread" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "slackTeamId" TEXT,
    "slackChannelId" TEXT NOT NULL,
    "slackThreadTs" TEXT NOT NULL,
    "slackUserId" TEXT,
    "slackUserName" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackThreadMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slackMessageTs" TEXT,
    "slackUserId" TEXT,
    "slackUserName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackThreadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");

-- CreateIndex
CREATE INDEX "Category_organizationId_idx" ON "Category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_organizationId_key" ON "Category"("name", "organizationId");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_idx" ON "Conversation"("organizationId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_userId_idx" ON "Conversation"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_idx" ON "KnowledgeSource"("organizationId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_categoryId_idx" ON "KnowledgeSource"("categoryId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_status_idx" ON "KnowledgeSource"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Chunk_sourceId_idx" ON "Chunk"("sourceId");

-- CreateIndex
CREATE INDEX "Chunk_organizationId_idx" ON "Chunk"("organizationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_organizationId_idx" ON "Message"("organizationId");

-- CreateIndex
CREATE INDEX "TokenUsage_organizationId_idx" ON "TokenUsage"("organizationId");

-- CreateIndex
CREATE INDEX "TokenUsage_userId_idx" ON "TokenUsage"("userId");

-- CreateIndex
CREATE INDEX "TokenUsage_createdAt_idx" ON "TokenUsage"("createdAt");

-- CreateIndex
CREATE INDEX "TokenUsage_operation_idx" ON "TokenUsage"("operation");

-- CreateIndex
CREATE INDEX "TokenUsage_organizationId_createdAt_idx" ON "TokenUsage"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationLimits_organizationId_key" ON "OrganizationLimits"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLimits_organizationId_idx" ON "OrganizationLimits"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLimits_isBlocked_idx" ON "OrganizationLimits"("isBlocked");

-- CreateIndex
CREATE INDEX "UserTokenLimits_organizationId_idx" ON "UserTokenLimits"("organizationId");

-- CreateIndex
CREATE INDEX "UserTokenLimits_userId_idx" ON "UserTokenLimits"("userId");

-- CreateIndex
CREATE INDEX "UserTokenLimits_organizationId_userId_idx" ON "UserTokenLimits"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTokenLimits_organizationId_userId_key" ON "UserTokenLimits"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "OrganizationUserPermissions_organizationId_idx" ON "OrganizationUserPermissions"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationUserPermissions_userId_idx" ON "OrganizationUserPermissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUserPermissions_organizationId_userId_key" ON "OrganizationUserPermissions"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "AvatarUploadLog_userId_uploadedAt_idx" ON "AvatarUploadLog"("userId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Group_organizationId_idx" ON "Group"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_organizationId_key" ON "Group"("name", "organizationId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_userId_groupId_key" ON "GroupMember"("userId", "groupId");

-- CreateIndex
CREATE INDEX "GroupCategoryAccess_groupId_idx" ON "GroupCategoryAccess"("groupId");

-- CreateIndex
CREATE INDEX "GroupCategoryAccess_categoryId_idx" ON "GroupCategoryAccess"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCategoryAccess_groupId_categoryId_key" ON "GroupCategoryAccess"("groupId", "categoryId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceCategory_sourceId_idx" ON "KnowledgeSourceCategory"("sourceId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceCategory_categoryId_idx" ON "KnowledgeSourceCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSourceCategory_sourceId_categoryId_key" ON "KnowledgeSourceCategory"("sourceId", "categoryId");

-- CreateIndex
CREATE INDEX "SlackIntegration_organizationId_idx" ON "SlackIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "SlackIntegration_slackTeamId_idx" ON "SlackIntegration"("slackTeamId");

-- CreateIndex
CREATE INDEX "SlackIntegration_slackBotUserId_idx" ON "SlackIntegration"("slackBotUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackIntegration_organizationId_slug_key" ON "SlackIntegration"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "SlackIntegrationCategory_integrationId_idx" ON "SlackIntegrationCategory"("integrationId");

-- CreateIndex
CREATE INDEX "SlackIntegrationCategory_categoryId_idx" ON "SlackIntegrationCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackIntegrationCategory_integrationId_categoryId_key" ON "SlackIntegrationCategory"("integrationId", "categoryId");

-- CreateIndex
CREATE INDEX "SlackIntegrationLog_integrationId_idx" ON "SlackIntegrationLog"("integrationId");

-- CreateIndex
CREATE INDEX "SlackIntegrationLog_organizationId_idx" ON "SlackIntegrationLog"("organizationId");

-- CreateIndex
CREATE INDEX "SlackIntegrationLog_createdAt_idx" ON "SlackIntegrationLog"("createdAt");

-- CreateIndex
CREATE INDEX "SlackIntegrationLog_organizationUserId_idx" ON "SlackIntegrationLog"("organizationUserId");

-- CreateIndex
CREATE INDEX "SlackIntegrationLog_integrationId_slackChannelId_slackThrea_idx" ON "SlackIntegrationLog"("integrationId", "slackChannelId", "slackThreadTs");

-- CreateIndex
CREATE INDEX "SlackThread_integrationId_idx" ON "SlackThread"("integrationId");

-- CreateIndex
CREATE INDEX "SlackThread_slackChannelId_idx" ON "SlackThread"("slackChannelId");

-- CreateIndex
CREATE INDEX "SlackThread_integrationId_slackChannelId_slackThreadTs_idx" ON "SlackThread"("integrationId", "slackChannelId", "slackThreadTs");

-- CreateIndex
CREATE UNIQUE INDEX "SlackThread_integrationId_slackThreadTs_key" ON "SlackThread"("integrationId", "slackThreadTs");

-- CreateIndex
CREATE INDEX "SlackThreadMessage_threadId_idx" ON "SlackThreadMessage"("threadId");

-- CreateIndex
CREATE INDEX "SlackThreadMessage_slackMessageTs_idx" ON "SlackThreadMessage"("slackMessageTs");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTokenLimits" ADD CONSTRAINT "UserTokenLimits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTokenLimits" ADD CONSTRAINT "UserTokenLimits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUserPermissions" ADD CONSTRAINT "OrganizationUserPermissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUserPermissions" ADD CONSTRAINT "OrganizationUserPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarUploadLog" ADD CONSTRAINT "AvatarUploadLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCategoryAccess" ADD CONSTRAINT "GroupCategoryAccess_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCategoryAccess" ADD CONSTRAINT "GroupCategoryAccess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSourceCategory" ADD CONSTRAINT "KnowledgeSourceCategory_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSourceCategory" ADD CONSTRAINT "KnowledgeSourceCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackIntegration" ADD CONSTRAINT "SlackIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackIntegrationCategory" ADD CONSTRAINT "SlackIntegrationCategory_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "SlackIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackIntegrationCategory" ADD CONSTRAINT "SlackIntegrationCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackIntegrationLog" ADD CONSTRAINT "SlackIntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "SlackIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackIntegrationLog" ADD CONSTRAINT "SlackIntegrationLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackThread" ADD CONSTRAINT "SlackThread_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "SlackIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackThreadMessage" ADD CONSTRAINT "SlackThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SlackThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

