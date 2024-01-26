import { expect, test, vi } from "vitest"
import { MapComponent as MapComponentClient } from "../../state-sync-lib/client/MapComponent"
import { MapComponent } from "../../state-sync-lib/server/MapComponent"

const GetData = () => {
  const client = new MapComponentClient<number>()

  const server = new MapComponent<number>()

  server.set("A", 1)
  server.set("B", 2)
  server.set("C", 3)

  const state = server.getCompleteState()
  client.loadCompleteState(state)

  server.resetRecentChanges()

  return { server, client, state }
}

test("complete state", () => {
  const { server, client, state } = GetData()

  // Check if the server state is correct
  expect(server.get("A")).toBe(1)
  expect(server.get("B")).toBe(2)
  expect(server.get("C")).toBe(3)

  expect(server.size()).toBe(3)

  // Check if full state data is correct
  expect(state).toMatchSnapshot()

  // Check if the client state is the same as the server state
  expect(client.get("A")).toBe(server.get("A"))
  expect(client.get("B")).toBe(server.get("B"))
  expect(client.get("C")).toBe(server.get("C"))

  expect(client.size()).toBe(server.size())
})

test("callbacks for complete state", () => {
  const { client, state } = GetData()

  // Create callbacks for the client
  const addCallback = vi.fn()
  client.onAdd(addCallback)

  client.loadCompleteState(state)

  // Check if the callbacks are called with the correct values
  expect(addCallback).toHaveBeenCalledWith("A", 1)
  expect(addCallback).toHaveBeenCalledWith("B", 2)
  expect(addCallback).toHaveBeenCalledWith("C", 3)

  expect(addCallback).toHaveBeenCalledTimes(3)
})

test("changes", () => {
  const { server, client } = GetData()

  // Add something on the server
  server.set("D", 4)

  // Remove somethin on the server
  server.delete("A")

  // Update something on the server
  server.set("B", 22)

  // Check if the server state is correct
  expect(server.get("A")).toBeUndefined()
  expect(server.get("B")).toBe(22)
  expect(server.get("C")).toBe(3)
  expect(server.get("D")).toBe(4)

  // Setup callbacks for the client
  const addCallback = vi.fn()
  client.onAdd(addCallback)

  const removeCallback = vi.fn()
  client.onRemove(removeCallback)

  const updateCallback = vi.fn()
  client.onUpdate(updateCallback)

  // Get the recent changes from the server
  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  // Check if the changes are correct
  expect(changes).toMatchSnapshot()

  // Apply the changes to the client
  client.applyRecentChanges(changes)

  // Check if the callbacks were called with the correct values
  expect(addCallback).toHaveBeenCalledWith("D", 4)
  expect(removeCallback).toHaveBeenCalledWith("A")
  expect(updateCallback).toHaveBeenCalledWith("B", 22)

  expect(addCallback).toHaveBeenCalledTimes(1)
  expect(removeCallback).toHaveBeenCalledTimes(1)
  expect(updateCallback).toHaveBeenCalledTimes(1)

  // Check if the client state is correct
  expect(client.get("A")).toBe(server.get("A"))
  expect(client.get("B")).toBe(server.get("B"))
  expect(client.get("C")).toBe(server.get("C"))
  expect(client.get("D")).toBe(server.get("D"))
})
