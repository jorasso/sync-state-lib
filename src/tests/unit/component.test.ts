import { expect, test, vi } from "vitest"
import {
  ComplexComponent,
  ComplexComponentClient,
  SimpleComponent,
} from "./TestComponents/TestComponents"

const GetData = () => {
  const client = new ComplexComponentClient()

  const server = new ComplexComponent()

  server.name = "A"
  server.subcomponent.name = "subA"
  server.subcomponent.id = 1
  server.subcomponent.active = true

  const state = server.getCompleteState()
  client.loadCompleteState(state)

  server.resetRecentChanges()

  return { server, client, state }
}

test("complete state", () => {
  const { server, client, state } = GetData()

  // Check if the server state is correct
  expect(server.name).toBe("A")
  expect(server.subcomponent.name).toBe("subA")
  expect(server.subcomponent.id).toBe(1)
  expect(server.subcomponent.active).toBe(true)

  // Check if full state data is correct
  expect(state).toMatchSnapshot()

  // Check if the client state is the same as the server state
  expect(client.name).toBe(server.name)
  expect(client.subcomponent.name).toBe(server.subcomponent.name)
  expect(client.subcomponent.id).toBe(server.subcomponent.id)
  expect(client.subcomponent.active).toBe(server.subcomponent.active)
})

test("callbacks for complete state", () => {
  const { client, state } = GetData()

  // Create callbacks for the client
  const nameUpdateCallback = vi.fn()
  client.on("name", nameUpdateCallback)

  const subcomponentNameUpdateCallback = vi.fn()
  client.subcomponent.on("name", subcomponentNameUpdateCallback)

  const subcomponentIdUpdateCallback = vi.fn()
  client.subcomponent.on("id", subcomponentIdUpdateCallback)

  const subcomponentActiveUpdateCallback = vi.fn()
  client.subcomponent.on("active", subcomponentActiveUpdateCallback)

  // Load the full state once again (it resets the current client state and should call all callbacks)
  client.loadCompleteState(state)

  // Check if callbacks were called
  expect(nameUpdateCallback).toHaveBeenCalledTimes(1)
  expect(nameUpdateCallback).toHaveBeenCalledWith("A")

  expect(subcomponentNameUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentNameUpdateCallback).toHaveBeenCalledWith("subA")

  expect(subcomponentIdUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledWith(1)

  expect(subcomponentActiveUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentActiveUpdateCallback).toHaveBeenCalledWith(true)

  // Check if the client state is correct
  expect(client.name).toBe("A")
  expect(client.subcomponent.name).toBe("subA")
  expect(client.subcomponent.id).toBe(1)
  expect(client.subcomponent.active).toBe(true)
})

test("update", () => {
  const { server, client } = GetData()

  // Update the server state
  server.name = "B"
  server.subcomponent.name = "subB"
  server.subcomponent.id = 2
  server.subcomponent.active = false

  // Check if the server state is correct
  expect(server.name).toBe("B")
  expect(server.subcomponent.name).toBe("subB")
  expect(server.subcomponent.id).toBe(2)
  expect(server.subcomponent.active).toBe(false)

  // Get recent changes
  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  // Check if the changes are correct
  expect(changes).toMatchSnapshot()

  // Before we apply changes to the client, let's add callbacks to check if they are called
  const nameUpdateCallback = vi.fn()
  client.on("name", nameUpdateCallback)

  const subcomponentNameUpdateCallback = vi.fn()
  client.subcomponent.on("name", subcomponentNameUpdateCallback)

  const subcomponentIdUpdateCallback = vi.fn()
  client.subcomponent.on("id", subcomponentIdUpdateCallback)

  const subcomponentActiveUpdateCallback = vi.fn()
  client.subcomponent.on("active", subcomponentActiveUpdateCallback)

  // Apply the changes to the client
  client.applyRecentChanges(changes)

  // Check if the client state is the same as server state
  expect(client.name).toBe(server.name)
  expect(client.subcomponent.name).toBe(server.subcomponent.name)
  expect(client.subcomponent.id).toBe(server.subcomponent.id)
  expect(client.subcomponent.active).toBe(server.subcomponent.active)

  // Check if callbacks were called
  expect(nameUpdateCallback).toHaveBeenCalledTimes(1)
  expect(nameUpdateCallback).toHaveBeenCalledWith("B")

  expect(subcomponentNameUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentNameUpdateCallback).toHaveBeenCalledWith("subB")

  expect(subcomponentIdUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledWith(2)

  expect(subcomponentActiveUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentActiveUpdateCallback).toHaveBeenCalledWith(false)
})

test("partial updates", () => {
  const { server, client } = GetData()

  // Change name
  server.name = "B"

  // Check if the server state is correct
  expect(server.name).toBe("B")

  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  // Check if the changes are correct
  expect(changes).toMatchSnapshot()

  // Before we apply changes to the client, let's add callbacks to check if they are called
  const nameUpdateCallback = vi.fn()
  client.on("name", nameUpdateCallback)

  client.applyRecentChanges(changes)

  // Check if the client state is the same as server state
  expect(client.name).toBe(server.name)

  // Check if callbacks were called
  expect(nameUpdateCallback).toHaveBeenCalledTimes(1)
  expect(nameUpdateCallback).toHaveBeenCalledWith("B")

  // More changes
  server.name = "C"
  server.subcomponent.id = 3

  // Check if the server state is correct
  expect(server.name).toBe("C")
  expect(server.subcomponent.id).toBe(3)

  const changes2 = server.getRecentChanges()
  server.resetRecentChanges()

  // Check if the changes are correct
  expect(changes2).toMatchSnapshot()

  // Before we apply changes to the client, let's add callbacks to check if they are called
  const subcomponentIdUpdateCallback = vi.fn()
  client.subcomponent.on("id", subcomponentIdUpdateCallback)

  client.applyRecentChanges(changes2)

  // Check if the client state is the same as server state
  expect(client.name).toBe(server.name)
  expect(client.subcomponent.id).toBe(server.subcomponent.id)

  // Check if callbacks were called
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledWith(3)

  expect(nameUpdateCallback).toHaveBeenCalledTimes(2)
  expect(nameUpdateCallback).toHaveBeenLastCalledWith("C")
})

test("reassigning subcomponent", () => {
  const { server, client } = GetData()

  // Change subcomponent
  server.subcomponent = new SimpleComponent()

  server.subcomponent.name = "subC"
  server.subcomponent.id = 3
  server.subcomponent.active = true

  // Check if the server state is correct
  expect(server.subcomponent.name).toBe("subC")
  expect(server.subcomponent.id).toBe(3)
  expect(server.subcomponent.active).toBe(true)

  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  // Check if the changes are correct
  expect(changes).toMatchSnapshot()

  // Before we apply changes to the client, let's add callbacks to check if they are called
  const subcomponentNameUpdateCallback = vi.fn()
  client.subcomponent.on("name", subcomponentNameUpdateCallback)

  const subcomponentIdUpdateCallback = vi.fn()
  client.subcomponent.on("id", subcomponentIdUpdateCallback)

  const subcomponentActiveUpdateCallback = vi.fn()
  client.subcomponent.on("active", subcomponentActiveUpdateCallback)

  client.applyRecentChanges(changes)

  // Check if the client state is the same as server state
  expect(client.subcomponent.name).toBe(server.subcomponent.name)
  expect(client.subcomponent.id).toBe(server.subcomponent.id)
  expect(client.subcomponent.active).toBe(server.subcomponent.active)

  // Check if callbacks were called
  expect(subcomponentNameUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentNameUpdateCallback).toHaveBeenCalledWith("subC")

  expect(subcomponentIdUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledWith(3)

  expect(subcomponentActiveUpdateCallback).toHaveBeenCalledTimes(1)
  expect(subcomponentActiveUpdateCallback).toHaveBeenCalledWith(true)
})
