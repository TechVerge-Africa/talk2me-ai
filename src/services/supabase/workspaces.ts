import { supabase } from './client';

export interface DbWorkspace {
  id: string;
  name: string;
  topic: string;
  icon: string;
  invite_code: string;
  owner_id: string;
  join_policy?: 'open' | 'approval';
  created_at: string;
  updated_at: string;
}

export interface DbWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  status?: 'approved' | 'pending' | 'rejected';
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

export interface DbWorkspaceChannel {
  id: string;
  workspace_id: string;
  name: string;
  type: 'channel' | 'dm';
  created_at: string;
}

export interface DbWorkspaceMessage {
  id: string;
  workspace_id: string;
  channel_name: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_ai: boolean;
  sources?: string[];
  created_at: string;
}

export interface FullWorkspaceData {
  workspace: DbWorkspace;
  members: DbWorkspaceMember[];
  channels: DbWorkspaceChannel[];
  messages: Record<string, DbWorkspaceMessage[]>;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'WS-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const WorkspaceService = {
  /**
   * Fetches all workspaces joined by the given user where membership is approved.
   */
  async getUserWorkspaces(userId: string): Promise<FullWorkspaceData[]> {
    // Fetch user memberships (only approved if status column exists)
    let memberRows: any[] | null = null;
    const { data: mData, error: memberErr } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, status, joined_at')
      .eq('user_id', userId)
      .or('status.eq.approved,status.is.null');

    if (memberErr) {
      if (memberErr.code === '42703' || memberErr.message?.includes('status')) {
        // Fallback for DB schemas prior to status column migration
        const { data: fallbackRows } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, joined_at')
          .eq('user_id', userId);
        memberRows = fallbackRows;
      } else {
        console.error('[getUserWorkspaces] Member error:', memberErr);
      }
    } else {
      memberRows = mData;
    }

    const workspaceIds = (memberRows || []).map((m: { workspace_id: string }) => m.workspace_id);

    // New users with no workspaces: return empty list so the UI can show
    // a proper onboarding prompt (Create or Join workspace).
    if (workspaceIds.length === 0) {
      return [];
    }

    // Fetch all workspaces details
    const { data: workspaces, error: wsErr } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)
      .order('created_at', { ascending: true });

    if (wsErr || !workspaces) {
      console.error('[getUserWorkspaces] Error fetching workspaces:', wsErr);
      return [];
    }

    const results: FullWorkspaceData[] = [];

    for (const ws of workspaces as DbWorkspace[]) {
      // Fetch members (only approved active members for the regular workspace view)
      let members: any[] | null = null;
      const { data: memberData, error: mErr } = await supabase
        .from('workspace_members')
        .select('*, profiles(full_name, avatar_url, role)')
        .eq('workspace_id', ws.id)
        .or('status.eq.approved,status.is.null');

      if (mErr && (mErr.code === '42703' || mErr.message?.includes('status'))) {
        const { data: fallbackMembers } = await supabase
          .from('workspace_members')
          .select('*, profiles(full_name, avatar_url, role)')
          .eq('workspace_id', ws.id);
        members = fallbackMembers;
      } else {
        members = memberData;
      }

      const formattedMembers: DbWorkspaceMember[] = (members || []).map((m: any) => ({
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role,
        status: m.status || 'approved',
        joined_at: m.joined_at,
        profile: m.profiles
          ? {
              full_name: m.profiles.full_name,
              avatar_url: m.profiles.avatar_url,
              role: m.profiles.role,
            }
          : undefined,
      }));

      // Fetch channels
      const { data: channels } = await supabase
        .from('workspace_channels')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: true });

      // Fetch messages grouped by channel
      const { data: rawMessages } = await supabase
        .from('workspace_messages')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: true });

      const messagesMap: Record<string, DbWorkspaceMessage[]> = {};
      (rawMessages || []).forEach((msg: any) => {
        if (!messagesMap[msg.channel_name]) {
          messagesMap[msg.channel_name] = [];
        }
        messagesMap[msg.channel_name].push({
          id: msg.id,
          workspace_id: msg.workspace_id,
          channel_name: msg.channel_name,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          content: msg.content,
          is_ai: msg.is_ai || false,
          sources: msg.sources || [],
          created_at: msg.created_at,
        });
      });

      results.push({
        workspace: ws,
        members: formattedMembers,
        channels: (channels as DbWorkspaceChannel[]) || [],
        messages: messagesMap,
      });
    }

    return results;
  },

  /**
   * Creates a new workspace with default channels and owner registration.
   */
  async createWorkspace(params: {
    name: string;
    topic?: string;
    icon?: string;
    userId: string;
    displayName?: string;
  }): Promise<FullWorkspaceData> {
    if (params.displayName && params.displayName.trim()) {
      await supabase
        .from('profiles')
        .upsert({
          id: params.userId,
          full_name: params.displayName.trim(),
          updated_at: new Date().toISOString(),
        });
    }

    const inviteCode = generateInviteCode();

    // 1. Insert Workspace
    let ws: any = null;
    const { data: wsData, error: wsErr } = await supabase
      .from('workspaces')
      .insert({
        name: params.name,
        topic: params.topic || 'General Workspace',
        icon: params.icon || 'rocket',
        invite_code: inviteCode,
        owner_id: params.userId,
        join_policy: 'open',
      })
      .select()
      .single();

    if (wsErr && (wsErr.code === '42703' || wsErr.message?.includes('join_policy'))) {
      const { data: fallbackWs, error: fallbackWsErr } = await supabase
        .from('workspaces')
        .insert({
          name: params.name,
          topic: params.topic || 'General Workspace',
          icon: params.icon || 'rocket',
          invite_code: inviteCode,
          owner_id: params.userId,
        })
        .select()
        .single();
      if (fallbackWsErr || !fallbackWs) {
        throw new Error(fallbackWsErr?.message || 'Failed to create workspace');
      }
      ws = fallbackWs;
    } else if (wsErr || !wsData) {
      console.error('[createWorkspace] Workspace insert error:', wsErr);
      throw new Error(wsErr?.message || 'Failed to create workspace');
    } else {
      ws = wsData;
    }

    // 2. Add owner to workspace_members as approved owner
    let ownerMemberRow: any = null;
    const { data: ownerRow, error: ownerErr } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: ws.id,
        user_id: params.userId,
        role: 'owner',
        status: 'approved',
      })
      .select('id, workspace_id, user_id, role, status, joined_at')
      .single();

    if (ownerErr && (ownerErr.code === '42703' || ownerErr.message?.includes('status'))) {
      const { data: fallbackOwner } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: ws.id,
          user_id: params.userId,
          role: 'owner',
        })
        .select('id, workspace_id, user_id, role, joined_at')
        .single();
      ownerMemberRow = fallbackOwner;
    } else {
      ownerMemberRow = ownerRow;
    }

    // 3. Create default channels (# General, # Product, # Engineering)
    const defaultChannels = ['# General', '# Product', '# Engineering'];
    const channelRows = defaultChannels.map((name) => ({
      workspace_id: ws.id,
      name,
      type: 'channel',
    }));

    const { data: channels } = await supabase
      .from('workspace_channels')
      .insert(channelRows)
      .select();

    // 4. Send welcome message in # General
    const { data: savedMsg } = await supabase
      .from('workspace_messages')
      .insert({
        workspace_id: ws.id,
        channel_name: '# General',
        sender_id: 'talk2me-ai',
        sender_name: 'Talk2Me AI',
        content: `Welcome to ${ws.name}! 🚀 Use @Talk2Me anywhere in chat or visit the Talk2Me AI tab to query workspace meeting transcripts and team knowledge.`,
        is_ai: true,
        sources: ['Workspace Setup'],
      })
      .select()
      .single();

    const ownerMember: DbWorkspaceMember = ownerMemberRow
      ? {
          id: ownerMemberRow.id,
          workspace_id: ownerMemberRow.workspace_id,
          user_id: ownerMemberRow.user_id,
          role: ownerMemberRow.role,
          status: ownerMemberRow.status || 'approved',
          joined_at: ownerMemberRow.joined_at,
        }
      : {
          id: `${ws.id}-owner`,
          workspace_id: ws.id,
          user_id: params.userId,
          role: 'owner',
          status: 'approved',
          joined_at: new Date().toISOString(),
        };

    return {
      workspace: ws as DbWorkspace,
      members: [ownerMember],
      channels: (channels as DbWorkspaceChannel[]) || [],
      messages: {
        '# General': savedMsg ? [savedMsg as DbWorkspaceMessage] : [],
      },
    };
  },

  /**
   * Join an existing workspace by Invite Code or Workspace ID.
   * Smartly normalizes spaces, case, dashes, and optional 'WS-' prefix.
   * Enforces setting user display name if provided.
   * Respects workspace join policy ('open' vs 'approval').
   */
  async joinWorkspaceByCode(
    inviteCodeOrId: string,
    userId: string,
    displayName?: string
  ): Promise<{ workspace: DbWorkspace; status: 'approved' | 'pending' }> {
    const raw = inviteCodeOrId.trim();
    if (!raw) {
      throw new Error('Please enter a valid invite code or workspace ID.');
    }

    if (displayName && displayName.trim()) {
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: displayName.trim(),
          updated_at: new Date().toISOString(),
        });
    }

    // Standardize input: strip internal whitespace, normalize unicode dashes, convert to uppercase
    const cleanCode = raw.replace(/\s+/g, '').replace(/[—–-]/g, '-').toUpperCase();

    const candidates = new Set<string>();
    candidates.add(raw);
    candidates.add(cleanCode);

    if (!cleanCode.startsWith('WS-')) {
      candidates.add(`WS-${cleanCode}`);
    }

    const candidateList = Array.from(candidates);

    const matchConditions: string[] = [];
    for (const c of candidateList) {
      matchConditions.push(`invite_code.ilike.${c}`);
      matchConditions.push(`id.eq.${c}`);
    }

    const { data: wsList, error: wsErr } = await supabase
      .from('workspaces')
      .select('*')
      .or(matchConditions.join(','));

    let ws = wsList && wsList.length > 0 ? (wsList[0] as DbWorkspace) : null;

    if (!ws) {
      const { data: allWorkspaces } = await supabase.from('workspaces').select('*');
      if (allWorkspaces) {
        ws = (allWorkspaces as DbWorkspace[]).find((w) => {
          const dbClean = (w.invite_code || '').replace(/\s+/g, '').replace(/[—–-]/g, '-').toUpperCase();
          return candidateList.some((c) => dbClean === c || w.id === c);
        }) || null;
      }
    }

    if (wsErr && !ws) {
      console.error('[joinWorkspaceByCode] Lookup error:', wsErr);
    }

    if (!ws) {
      throw new Error('Workspace not found. Please verify your invite code.');
    }

    // Determine initial status based on workspace policy
    const initialStatus: 'approved' | 'pending' = ws.join_policy === 'approval' ? 'pending' : 'approved';

    // Check existing membership
    const { data: existing, error: existErr } = await supabase
      .from('workspace_members')
      .select('id, status')
      .eq('workspace_id', ws.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      const { error: joinErr } = await supabase.from('workspace_members').insert({
        workspace_id: ws.id,
        user_id: userId,
        role: 'member',
        status: initialStatus,
      });

      if (joinErr) {
        if (joinErr.code === '42703' || joinErr.message?.includes('status')) {
          const { error: fallbackJoinErr } = await supabase.from('workspace_members').insert({
            workspace_id: ws.id,
            user_id: userId,
            role: 'member',
          });
          if (fallbackJoinErr) {
            throw new Error(fallbackJoinErr.message);
          }
          this.postAiWelcomeMessage(ws.id, userId, displayName);
          return { workspace: ws, status: 'approved' };
        }
        throw new Error(joinErr.message);
      }
      if (initialStatus === 'approved') {
        this.postAiWelcomeMessage(ws.id, userId, displayName);
      }
      return { workspace: ws, status: initialStatus };
    } else {
      const currentStatus = ((existing as any).status as 'approved' | 'pending') || 'approved';
      return { workspace: ws, status: currentStatus };
    }
  },

  /**
   * Fetch pending join requests for a workspace (Owners / Admins)
   */
  async getPendingJoinRequests(workspaceId: string): Promise<DbWorkspaceMember[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*, profiles(full_name, avatar_url, role)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('[getPendingJoinRequests] Error:', error);
      return [];
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      workspace_id: m.workspace_id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      profile: m.profiles
        ? {
            full_name: m.profiles.full_name,
            avatar_url: m.profiles.avatar_url,
            role: m.profiles.role,
          }
        : undefined,
    }));
  },

  /**
   * Posts an automated AI welcome message in `# General` channel when a new member joins or is approved.
   */
  async postAiWelcomeMessage(workspaceId: string, userId: string, displayName?: string) {
    try {
      let memberName = displayName;
      if (!memberName) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();
        memberName = profile?.full_name || 'New Member';
      }

      const welcomeText = `🎉 Welcome @${memberName} to the workspace! 🚀 We're thrilled to have you here. I'm Talk2Me AI, your intelligent team co-pilot. Feel free to jump into any channel discussion, brainstorm ideas, plan features, or tag me @Talk2Me whenever you need assistance!`;

      await this.sendWorkspaceMessage({
        workspaceId,
        channelName: '# General',
        senderId: 'talk2me-ai',
        senderName: 'Talk2Me AI',
        content: welcomeText,
        isAi: true,
        sources: ['Automated AI Onboarding Welcome'],
      });
    } catch (err) {
      console.warn('[postAiWelcomeMessage] Failed to post welcome message:', err);
    }
  },

  /**
   * Approve a pending join request
   */
  async approveJoinRequest(workspaceId: string, memberId: string): Promise<void> {
    const { data: memberData } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('id', memberId)
      .maybeSingle();

    const { error } = await supabase
      .from('workspace_members')
      .update({ status: 'approved' })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(error.message || 'Failed to approve member');
    }

    if (memberData?.user_id) {
      this.postAiWelcomeMessage(workspaceId, memberData.user_id);
    }
  },

  /**
   * Reject a pending join request
   */
  async rejectJoinRequest(workspaceId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(error.message || 'Failed to reject join request');
    }
  },

  /**
   * Update workspace join policy ('open' vs 'approval')
   */
  async updateWorkspaceJoinPolicy(
    workspaceId: string,
    policy: 'open' | 'approval'
  ): Promise<DbWorkspace> {
    const { data, error } = await supabase
      .from('workspaces')
      .update({ join_policy: policy, updated_at: new Date().toISOString() })
      .eq('id', workspaceId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update workspace access policy');
    }

    return data as DbWorkspace;
  },

  /**
   * Remove a member from workspace (Owner / Admin command)
   */
  async removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(error.message || 'Failed to remove member');
    }
  },

  /**
   * Update a member's role (Owner command)
   */
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(error.message || 'Failed to update member role');
    }
  },

  /**
   * Delete a channel in a workspace (Owner / Admin command)
   */
  async deleteChannel(workspaceId: string, channelId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_channels')
      .delete()
      .eq('id', channelId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(error.message || 'Failed to delete channel');
    }
  },

  /**
   * Create a new channel in a workspace.
   */
  async createChannel(workspaceId: string, channelName: string): Promise<DbWorkspaceChannel> {
    const formattedName = channelName.startsWith('#') ? channelName : `# ${channelName}`;

    const { data: channel, error } = await supabase
      .from('workspace_channels')
      .insert({
        workspace_id: workspaceId,
        name: formattedName,
        type: 'channel',
      })
      .select()
      .single();

    if (error || !channel) {
      throw new Error(error?.message || 'Failed to create channel');
    }

    return channel as DbWorkspaceChannel;
  },

  /**
   * Send a message to a channel in a workspace.
   */
  async sendWorkspaceMessage(params: {
    workspaceId: string;
    channelName: string;
    senderId: string;
    senderName: string;
    content: string;
    isAi?: boolean;
    sources?: string[];
  }): Promise<DbWorkspaceMessage> {
    const { data: msg, error } = await supabase
      .from('workspace_messages')
      .insert({
        workspace_id: params.workspaceId,
        channel_name: params.channelName,
        sender_id: params.senderId,
        sender_name: params.senderName,
        content: params.content,
        is_ai: params.isAi || false,
        sources: params.sources || [],
      })
      .select()
      .single();

    if (error || !msg) {
      throw new Error(error?.message || 'Failed to send workspace message');
    }

    return msg as DbWorkspaceMessage;
  },

  /**
   * Subscribes to real-time message changes for a workspace channel.
   */
  subscribeToWorkspaceMessages(
    workspaceId: string,
    onMessage: (msg: DbWorkspaceMessage) => void
  ) {
    const subscription = supabase
      .channel(`ws-messages-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: any) => {
          onMessage(payload.new as DbWorkspaceMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  /**
   * Subscribes to real-time membership changes for a workspace.
   * Calls onMemberJoined with a fully-shaped DbWorkspaceMember (including profile)
   * whenever someone joins. Calls onMemberLeft with the user_id when someone leaves.
   */
  subscribeToWorkspaceMembers(
    workspaceId: string,
    onMemberJoined: (member: DbWorkspaceMember) => void,
    onMemberLeft?: (userId: string) => void
  ) {
    const subscription = supabase
      .channel(`ws-members-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload: any) => {
          const raw = payload.new;
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('id', raw.user_id)
            .maybeSingle();

          const member: DbWorkspaceMember = {
            id: raw.id,
            workspace_id: raw.workspace_id,
            user_id: raw.user_id,
            role: raw.role,
            status: raw.status || 'approved',
            joined_at: raw.joined_at,
            profile: profileData
              ? {
                  full_name: profileData.full_name,
                  avatar_url: profileData.avatar_url,
                  role: profileData.role,
                }
              : undefined,
          };
          onMemberJoined(member);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: any) => {
          if (onMemberLeft) {
            onMemberLeft(payload.old?.user_id as string);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },
};


