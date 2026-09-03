/**
 * Agent resource for interacting with the QuantaSeal AI security agent.
 *
 * Provides conversational query capability and conversation management.
 */

import type { Transport } from "./transport.js";

/** A single message in a conversation. */
export interface AgentMessage {
  /** Message role ("user" or "assistant"). */
  role: "user" | "assistant";
  /** Message content. */
  content: string;
  /** ISO 8601 timestamp. */
  createdAt?: string;
}

/** An agent conversation session. */
export interface AgentConversation {
  /** UUID of the conversation. */
  id: string;
  /** Conversation title (auto-generated from first message). */
  title?: string;
  /** Message count. */
  messageCount: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last activity timestamp. */
  lastMessageAt?: string;
}

/** Result of querying the agent. */
export interface AgentQueryResult {
  /** Agent's response message. */
  response: string;
  /** Conversation ID (useful for follow-up queries). */
  conversationId: string;
  /** Full conversation history (if returned). */
  messages?: AgentMessage[];
}

/**
 * Agent operations - query the AI security agent and manage conversations.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const result = await qs.agent.query("What encryption algorithm should I use for PCI-DSS?");
 * const followUp = await qs.agent.query("What about key sizes?", result.conversationId);
 * ```
 */
export class AgentResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Send a message to the AI security agent.
   *
   * @param message - User message / question.
   * @param conversationId - Optional existing conversation UUID for multi-turn chat.
   * @returns AgentQueryResult with the agent response and conversation ID.
   */
  async query(
    message: string,
    conversationId?: string,
  ): Promise<AgentQueryResult> {
    const body: Record<string, unknown> = { message };
    if (conversationId != null) body.conversation_id = conversationId;

    const resp = await this.transport.request<{
      response: string;
      conversation_id: string;
      messages?: Array<{ role: string; content: string; created_at?: string }>;
    }>("POST", "/api/v2/agent/query", { json: body });

    const d = resp.data!;
    return {
      response: d.response,
      conversationId: d.conversation_id,
      messages: d.messages?.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.created_at,
      })),
    };
  }

  /**
   * List all conversations for the current tenant.
   *
   * @returns Array of AgentConversation summaries.
   */
  async listConversations(): Promise<AgentConversation[]> {
    const resp = await this.transport.request<Array<{
      id: string;
      title?: string;
      message_count: number;
      created_at: string;
      last_message_at?: string;
    }>>("GET", "/api/v2/agent/conversations");
    return (resp.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      messageCount: d.message_count,
      createdAt: d.created_at,
      lastMessageAt: d.last_message_at,
    }));
  }

  /**
   * Retrieve a single conversation with its full message history.
   *
   * @param id - UUID of the conversation.
   * @returns AgentConversation with messages.
   */
  async getConversation(
    id: string,
  ): Promise<AgentConversation & { messages: AgentMessage[] }> {
    const resp = await this.transport.request<{
      id: string;
      title?: string;
      message_count: number;
      created_at: string;
      last_message_at?: string;
      messages: Array<{ role: string; content: string; created_at?: string }>;
    }>("GET", `/api/v2/agent/conversations/${id}`);
    const d = resp.data!;
    return {
      id: d.id,
      title: d.title,
      messageCount: d.message_count,
      createdAt: d.created_at,
      lastMessageAt: d.last_message_at,
      messages: (d.messages ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.created_at,
      })),
    };
  }

  /**
   * Delete a conversation and all its messages.
   *
   * @param id - UUID of the conversation to delete.
   */
  async deleteConversation(id: string): Promise<void> {
    await this.transport.requestRaw(
      "DELETE",
      `/api/v2/agent/conversations/${id}`,
    );
  }
}
