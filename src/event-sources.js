export class HttpMissionEventFeed {
    baseUrl;
    agentId;
    fetchImpl;
    headers;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        this.agentId = options.agentId;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.headers = options.headers ?? {};
    }
    async poll(fromCursor, limit = 50) {
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
        const body = (await response.json());
        if (!Array.isArray(body)) {
            throw new Error("Mission event feed expected an array response");
        }
        return body.map((item) => this.normalize(item));
    }
    normalize(item) {
        if (typeof item !== "object" || item === null) {
            throw new Error("Invalid mission event payload");
        }
        const event = item;
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
export class InMemoryMissionEventFeed {
    events;
    constructor(events) {
        this.events = events;
    }
    async poll(fromCursor, limit = 50) {
        return this.events
            .filter((event) => event.cursor >= fromCursor)
            .sort((a, b) => a.cursor - b.cursor)
            .slice(0, limit);
    }
}
