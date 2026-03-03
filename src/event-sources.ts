import type { FetchLike } from "./client";
import type { MissionEvent } from "./types";
import type { MissionEventFeed } from "./worker-runtime";

export interface HttpMissionEventFeedOptions {
  baseUrl: string;
  agentId?: string;
  fetchImpl?: FetchLike;
  headers?: Record<string, string>;
}

export class HttpMissionEventFeed implements MissionEventFeed {
  private readonly baseUrl: string;
  private readonly agentId?: string;
  private readonly fetchImpl: FetchLike;
  private readonly headers: Record<string, string>;

  constructor(options: HttpMissionEventFeedOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.agentId = options.agentId;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.headers = options.headers ?? {};
  }

  async poll(fromCursor: number, limit = 50): Promise<MissionEvent[]> {
    const url = new URL(`${this.baseUrl}/events`);
    url.searchParams.set("from", String(fromCursor));
    url.searchParams.set("limit", String(limit));
    if (this.agentId) {
      url.searchParams.set("agentId", this.agentId);
    }

    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...this.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Mission event feed failed (${response.status}): ${text}`);
    }

    const body = (await response.json()) as unknown;
    if (!Array.isArray(body)) {
      throw new Error("Mission event feed expected an array response");
    }

    return body.map((item) => this.normalize(item));
  }

  private normalize(item: unknown): MissionEvent {
    if (typeof item !== "object" || item === null) {
      throw new Error("Invalid mission event payload");
    }

    const event = item as Record<string, unknown>;
    if (typeof event.cursor !== "number" || typeof event.topic !== "string") {
      throw new Error("Invalid mission event fields");
    }

    return {
      cursor: event.cursor,
      topic: event.topic,
      payload: event.payload,
      createdAt: typeof event.createdAt === "number" ? event.createdAt : undefined,
    };
  }
}

export class InMemoryMissionEventFeed implements MissionEventFeed {
  constructor(private readonly events: MissionEvent[]) {}

  async poll(fromCursor: number, limit = 50): Promise<MissionEvent[]> {
    return this.events
      .filter((event) => event.cursor >= fromCursor)
      .sort((a, b) => a.cursor - b.cursor)
      .slice(0, limit);
  }
}
