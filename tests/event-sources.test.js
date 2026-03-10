import { describe, expect, it } from "bun:test";
import { HttpMissionEventFeed, InMemoryMissionEventFeed } from "../src/event-sources";
describe("Event source adapters", () => {
    it("filters in-memory events by cursor", async () => {
        const feed = new InMemoryMissionEventFeed([
            { cursor: 0, topic: "mission.created", payload: { missionId: "m1" } },
            { cursor: 1, topic: "mission.claimed", payload: { missionId: "m1" } },
            { cursor: 2, topic: "mission.settled", payload: { missionId: "m1" } },
        ]);
        const events = await feed.poll(1, 10);
        expect(events.length).toBe(2);
        expect(events[0]?.cursor).toBe(1);
    });
    it("loads events from HTTP adapter", async () => {
        const feed = new HttpMissionEventFeed({
            baseUrl: "https://pact.example",
            agentId: "agent-1",
            fetchImpl: async (input) => {
                const url = String(input);
                expect(url).toContain("https://pact.example/events");
                expect(url).toContain("from=5");
                expect(url).toContain("agentId=agent-1");
                return new Response(JSON.stringify([
                    { cursor: 5, topic: "mission.available", payload: { missionId: "m2" } },
                ]), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        });
        const events = await feed.poll(5, 20);
        expect(events.length).toBe(1);
        expect(events[0]?.topic).toBe("mission.available");
    });
});
