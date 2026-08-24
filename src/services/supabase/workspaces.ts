import { supabase } from './client';

export interface DbWorkspace {
  id: string;
  name: string;
  topic: string;
  icon: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
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
   * Fetches all workspaces joined by the given user.
   */
  async getUserWorkspaces(userId: string): Promise<FullWorkspaceData[]> {
    // Fetch user memberships
    const { data: memberRows, error: memberErr } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, joined_at')
      .eq('user_id', userId);

    if (memberErr) {
      console.error('[getUserWorkspaces] Member error:', memberErr);
    }

    const workspaceIds = (memberRows || []).map((m: { workspace_id: string }) => m.workspace_id);

    if (workspaceIds.length === 0) {
      // Create a default starter workspace for new users
      const starter = await this.createWorkspace({
        name: 'Talk2Me Team',
        topic: 'Product roadmap & real-time collaboration',
        icon: 'rocket',
        userId,
      });
      return [starter];
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
      // Fetch members
      const { data: members } = await supabase
        .from('workspace_members')
        .select('*, profiles(full_name, avatar_url, role)')
        .eq('workspace_id', ws.id);

      const formattedMembers: DbWorkspaceMember[] = (members || []).map((m: any) => ({
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role,
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
  }): Promise<FullWorkspaceData> {
    const inviteCode = generateInviteCode();

    // 1. Insert Workspace
    const { data: ws, error: wsErr } = await supabase
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

    if (wsErr || !ws) {
      console.error('[createWorkspace] Workspace insert error:', wsErr);
      throw new Error(wsErr?.message || 'Failed to create workspace');
    }

    // 2. Add owner to workspace_members
    await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: params.userId,
      role: 'owner',
    });

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
    const welcomeMsg: DbWorkspaceMessage = {
      id: '',
      workspace_id: ws.id,
      channel_name: '# General',
      sender_id: 'talk2me-ai',
      sender_name: 'Talk2Me AI',
      content: `Welcome to ${ws.name}! 🚀 Use @Talk2Me anywhere in chat or visit the Talk2Me AI tab to query workspace meeting transcripts and team knowledge.`,
      is_ai: true,
      sources: ['Workspace Setup'],
      created_at: new Date().toISOString(),
    };

    const { data: savedMsg } = await supabase
      .from('workspace_messages')
      .insert({
        workspace_id: ws.id,
        channel_name: '# General',
        sender_id: welcomeMsg.sender_id,
        sender_name: welcomeMsg.sender_name,
        content: welcomeMsg.content,
        is_ai: true,
        sources: welcomeMsg.sources,
      })
      .select()
      .single();

    return {
      workspace: ws as DbWorkspace,
      members: [
        {
          id: 'owner-mem',
          workspace_id: ws.id,
          user_id: params.userId,
          role: 'owner',
          joined_at: new Date().toISOString(),
        },
      ],
      channels: (channels as DbWorkspaceChannel[]) || [],
      messages: {
        '# General': savedMsg ? [savedMsg as DbWorkspaceMessage] : [welcomeMsg],
      },
    };
  },

  /**
   * Join an existing workspace by Invite Code or Workspace ID.
   */
  async joinWorkspaceByCode(inviteCodeOrId: string, userId: string): Promise<DbWorkspace> {
    const cleanCode = inviteCodeOrId.trim();

    // Find workspace by invite_code OR id
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('*')
      .or(`invite_code.eq.${cleanCode},id.eq.${cleanCode}`)
      .single();

    if (wsErr || !ws) {
      throw new Error('Workspace not found. Please verify your invite code.');
    }

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', ws.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      const { error: joinErr } = await supabase.from('workspace_members').insert({
        workspace_id: ws.id,
        user_id: userId,
        role: 'member',
      });

      if (joinErr) {
        throw new Error(joinErr.message);
      }
    }

    return ws as DbWorkspace;
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
};
