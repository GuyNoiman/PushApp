/**
 * SupabaseMessagingGateway — the Supabase implementation of {@link MessagingGateway}, and the only
 * file in the messaging pillar that imports the SDK.
 *
 * It enforces nothing by itself: Row-Level Security in `supabase/migrations/0003_direct_messaging.sql`
 * is the real gate, and it is written so that a participant sees their own conversations and nobody
 * else's, a sender cannot mark their own message read, and nothing can be inserted into a blocked
 * conversation. This class maps domain calls onto those tables.
 *
 * IT NEVER SEES A PLAINTEXT BODY. Everything it sends and receives is already sealed
 * (`crypto.ts`), which is what makes the promise in Inbox PRD §14.1 structural rather than a
 * convention somebody could forget.
 */
import { supabase } from '../social/supabaseClient';
import { pairId, participantsOf, type ConversationPermission } from './model';
import type {
  ConversationRow,
  MessagingGateway,
  SealedMessageRow,
} from './MessagingGateway';

function toConversation(row: any): ConversationRow {
  return {
    id: row.id,
    participantIds: [row.participant_a, row.participant_b],
    permission: row.permission as ConversationPermission,
    ...(row.requested_by ? { requestedBy: row.requested_by } : {}),
    ...(row.requested_at ? { requestedAt: new Date(row.requested_at).getTime() } : {}),
    ...(row.approved_at ? { approvedAt: new Date(row.approved_at).getTime() } : {}),
    ...(row.expires_at ? { expiresAt: new Date(row.expires_at).getTime() } : {}),
    ...(row.last_message_at ? { lastMessageAt: new Date(row.last_message_at).getTime() } : {}),
  };
}

function toMessage(row: any): SealedMessageRow {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    sealed: {
      forRecipient: row.ciphertext_recipient,
      forSender: row.ciphertext_sender,
      nonce: row.nonce,
      keyVersion: row.key_version,
    },
    kind: row.kind,
    createdAt: new Date(row.created_at).getTime(),
    ...(row.delivered_at ? { deliveredAt: new Date(row.delivered_at).getTime() } : {}),
    ...(row.read_at ? { readAt: new Date(row.read_at).getTime() } : {}),
  };
}

export class SupabaseMessagingGateway implements MessagingGateway {
  private uid: string | null = null;

  get enabled(): boolean {
    return supabase !== null;
  }

  private client() {
    if (!supabase) throw new Error('messaging backend not configured');
    return supabase;
  }

  private async requireUid(): Promise<string> {
    if (this.uid) return this.uid;
    const { data } = await this.client().auth.getUser();
    this.uid = data.user?.id ?? null;
    if (!this.uid) throw new Error('not signed in');
    return this.uid;
  }

  async publishPublicKey(publicKey: string): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client()
      .from('profiles')
      .update({ message_public_key: publicKey, message_key_updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async publicKeyOf(userId: string): Promise<string | null> {
    const { data } = await this.client()
      .from('profiles')
      .select('message_public_key')
      .eq('id', userId)
      .maybeSingle();
    return (data as { message_public_key?: string } | null)?.message_public_key ?? null;
  }

  async listConversations(): Promise<ConversationRow[]> {
    const id = await this.requireUid();
    const { data, error } = await this.client()
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${id},participant_b.eq.${id}`);
    if (error) throw error;
    return (data ?? []).map(toConversation);
  }

  async openConversation(
    withUserId: string,
    permission: 'requested' | 'approved',
  ): Promise<ConversationRow> {
    const me = await this.requireUid();
    const id = pairId(me, withUserId);
    const [a, b] = participantsOf(me, withUserId);

    const existing = await this.client().from('conversations').select('*').eq('id', id).maybeSingle();
    if (existing.data) return toConversation(existing.data);

    const now = new Date();
    const row: Record<string, unknown> = {
      id,
      participant_a: a,
      participant_b: b,
      permission,
      requested_by: me,
      requested_at: now.toISOString(),
    };
    if (permission === 'requested') {
      row.expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      row.approved_at = now.toISOString();
    }
    const { data, error } = await this.client().from('conversations').insert(row).select('*').single();
    if (error) throw error;
    return toConversation(data);
  }

  async approveConversation(conversationId: string): Promise<void> {
    const { error } = await this.client()
      .from('conversations')
      // Clearing the expiry is the point: an accepted conversation does not expire.
      .update({ permission: 'approved', approved_at: new Date().toISOString(), expires_at: null })
      .eq('id', conversationId);
    if (error) throw error;
  }

  async blockConversation(conversationId: string): Promise<void> {
    const me = await this.requireUid();
    const { error } = await this.client()
      .from('conversations')
      .update({ permission: 'blocked', blocked_by: me })
      .eq('id', conversationId);
    if (error) throw error;
  }

  async listMessages(conversationId: string, limit = 200): Promise<SealedMessageRow[]> {
    const { data, error } = await this.client()
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toMessage);
  }

  async sendSealed(row: Omit<SealedMessageRow, 'createdAt' | 'deliveredAt' | 'readAt'>): Promise<void> {
    const { error } = await this.client().from('messages').insert({
      id: row.id,
      conversation_id: row.conversationId,
      sender_id: row.senderId,
      ciphertext_recipient: row.sealed.forRecipient,
      ciphertext_sender: row.sealed.forSender,
      nonce: row.sealed.nonce,
      key_version: row.sealed.keyVersion,
      kind: row.kind,
    });
    // A duplicate id means the same message was already delivered — a retry that succeeded. That is
    // the idempotency the PRD asks for (§10.2), so it is not an error to report.
    if (error && !`${error.message}`.includes('duplicate key')) throw error;

    await this.client()
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', row.conversationId);
  }

  async markRead(messageIds: readonly string[]): Promise<void> {
    if (messageIds.length === 0) return;
    const { error } = await this.client()
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', [...messageIds])
      .is('read_at', null);
    if (error) throw error;
  }

  subscribeToMessages(uid: string, onMessage: (row: SealedMessageRow) => void): () => void {
    if (!supabase || !uid) return () => {};
    const client = supabase;
    const channel = client
      .channel(`messages:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // RLS already limits what arrives to conversations this user is in.
        onMessage(toMessage(payload.new));
      })
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }

  async setMute(conversationId: string, mutedUntil: number | null | undefined): Promise<void> {
    const me = await this.requireUid();
    if (mutedUntil === undefined) {
      await this.client()
        .from('conversation_mutes')
        .delete()
        .eq('user_id', me)
        .eq('conversation_id', conversationId);
      return;
    }
    const { error } = await this.client().from('conversation_mutes').upsert({
      user_id: me,
      conversation_id: conversationId,
      muted_until: mutedUntil === null ? null : new Date(mutedUntil).toISOString(),
    });
    if (error) throw error;
  }

  async listMutes(): Promise<Record<string, number | null>> {
    const me = await this.requireUid();
    const { data } = await this.client()
      .from('conversation_mutes')
      .select('conversation_id, muted_until')
      .eq('user_id', me);
    const out: Record<string, number | null> = {};
    for (const row of (data ?? []) as { conversation_id: string; muted_until: string | null }[]) {
      out[row.conversation_id] = row.muted_until ? new Date(row.muted_until).getTime() : null;
    }
    return out;
  }
}
