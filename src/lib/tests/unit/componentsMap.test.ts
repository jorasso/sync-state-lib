import { expect, test, vi } from "vitest"
import { ComponentsMapComponent as ComponentsMapComponentClient } from "../../client/ComponentsMapComponent"
import { ComponentsMapComponent } from "../../server/ComponentsMapComponent"
import {
  ComplexComponent,
  ComplexComponentClient,
  SimpleComponent,
} from "./TestComponents/TestComponents"

const GetData = () => {
  const client = new ComponentsMapComponentClient<ComplexComponentClient>(
    ComplexComponentClient
  )

  const server = new ComponentsMapComponent<ComplexComponent>(ComplexComponent)

  const componentA = new ComplexComponent()
  componentA.name = "A"
  componentA.subcomponent.name = "subA"
  componentA.subcomponent.id = 1
  componentA.subcomponent.active = true

  server.set("a", componentA)

  const componentB = new ComplexComponent()
  componentB.name = "B"
  componentB.subcomponent.name = "subB"
  componentB.subcomponent.id = 2
  componentB.subcomponent.active = false

  server.set("b", componentB)

  const componentC = new ComplexComponent()
  componentC.name = "C"
  componentC.subcomponent.name = "subC"
  componentC.subcomponent.id = 3
  componentC.subcomponent.active = true

  server.set("c", componentC)

  const state = server.getCompleteState()
  client.loadCompleteState(state)

  server.resetRecentChanges()

  return { server, client, state }
}

test("complete state", () => {
  const { server, client, state } = GetData()

  // Check if the server state is correct
  expect(server.get("a")).toBeDefined()
  expect(server.get("b")).toBeDefined()
  expect(server.get("c")).toBeDefined()

  expect(server.size()).toBe(3)

  expect(server.get("a").name).toBe("A")
  expect(server.get("b").name).toBe("B")
  expect(server.get("c").name).toBe("C")

  expect(server.get("a").subcomponent.name).toBe("subA")
  expect(server.get("b").subcomponent.name).toBe("subB")
  expect(server.get("c").subcomponent.name).toBe("subC")

  expect(server.get("a").subcomponent.id).toBe(1)
  expect(server.get("b").subcomponent.id).toBe(2)
  expect(server.get("c").subcomponent.id).toBe(3)

  expect(server.get("a").subcomponent.active).toBe(true)
  expect(server.get("b").subcomponent.active).toBe(false)
  expect(server.get("c").subcomponent.active).toBe(true)

  // Check if full state data is correct
  expect(state).toMatchSnapshot()

  // Check if the client state is the same as the server state
  expect(client.get("a")).toBeDefined()
  expect(client.get("b")).toBeDefined()
  expect(client.get("c")).toBeDefined()

  expect(client.size()).toBe(3)

  expect(client.get("a").name).toBe(server.get("a").name)
  expect(client.get("b").name).toBe(server.get("b").name)
  expect(client.get("c").name).toBe(server.get("c").name)

  expect(client.get("a").subcomponent.name).toBe(
    server.get("a").subcomponent.name
  )
  expect(client.get("b").subcomponent.name).toBe(
    server.get("b").subcomponent.name
  )
  expect(client.get("c").subcomponent.name).toBe(
    server.get("c").subcomponent.name
  )

  expect(client.get("a").subcomponent.id).toBe(server.get("a").subcomponent.id)
  expect(client.get("b").subcomponent.id).toBe(server.get("b").subcomponent.id)
  expect(client.get("c").subcomponent.id).toBe(server.get("c").subcomponent.id)

  expect(client.get("a").subcomponent.active).toBe(
    server.get("a").subcomponent.active
  )
  expect(client.get("b").subcomponent.active).toBe(
    server.get("b").subcomponent.active
  )
  expect(client.get("c").subcomponent.active).toBe(
    server.get("c").subcomponent.active
  )
})

test("callbacks for initial state", () => {
  const { client, state } = GetData()

  // Create callbacks for the client
  const addCallback = vi.fn()

  const nameUpdateCallback = vi.fn()

  const subcomponentNameUpdateCallback = vi.fn()
  const subcomponentIdUpdateCallback = vi.fn()
  const subcomponentActiveUpdateCallback = vi.fn()

  client.onAdd((key: string, component: ComplexComponentClient) => {
    addCallback(key, component)

    component.on("name", nameUpdateCallback)

    component.subcomponent.on("name", subcomponentNameUpdateCallback)
    component.subcomponent.on("id", subcomponentIdUpdateCallback)
    component.subcomponent.on("active", subcomponentActiveUpdateCallback)
  })

  // Should reset the client state
  client.loadCompleteState(state)

  // Check if the callbacks are called with the correct values
  expect(addCallback).toHaveBeenCalledWith("a", client.get("a"))
  expect(addCallback).toHaveBeenCalledWith("b", client.get("b"))
  expect(addCallback).toHaveBeenCalledWith("c", client.get("c"))

  expect(addCallback).toHaveBeenCalledTimes(3)

  expect(nameUpdateCallback).toHaveBeenCalledTimes(3)
  expect(nameUpdateCallback).toHaveBeenCalledWith("A")
  expect(nameUpdateCallback).toHaveBeenCalledWith("B")
  expect(nameUpdateCallback).toHaveBeenCalledWith("C")

  expect(subcomponentNameUpdateCallback).toHaveBeenCalledTimes(3)
  expect(subcomponentNameUpdateCallback).toHaveBeenCalledWith("subA")
  expect(subcomponentNameUpdateCallback).toHaveBeenCalledWith("subB")
  expect(subcomponentNameUpdateCallback).toHaveBeenCalledWith("subC")

  expect(subcomponentIdUpdateCallback).toHaveBeenCalledTimes(3)
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledWith(1)
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledWith(2)
  expect(subcomponentIdUpdateCallback).toHaveBeenCalledWith(3)
})

test("add component", () => {
  const { server, client } = GetData()

  const addCallback = vi.fn()
  client.onAdd(addCallback)

  const componentD = new ComplexComponent()
  componentD.name = "D"
  componentD.subcomponent.name = "subD"
  componentD.subcomponent.id = 4
  componentD.subcomponent.active = true

  server.set("d", componentD)

  const recentChanges = server.getRecentChanges()
  server.resetRecentChanges()

  expect(recentChanges).toMatchSnapshot()

  client.applyRecentChanges(recentChanges)

  const componentDClient = client.get("d")
  expect(componentDClient).toBeDefined()
  expect(componentDClient?.name).toBe("D")
  expect(componentDClient?.subcomponent.name).toBe("subD")
  expect(componentDClient?.subcomponent.id).toBe(4)
  expect(componentDClient?.subcomponent.active).toBe(true)

  const componentDServer = server.get("d")
  expect(componentDServer).toBeDefined()
  expect(componentDServer?.name).toBe("D")
  expect(componentDServer?.subcomponent.name).toBe("subD")
  expect(componentDServer?.subcomponent.id).toBe(4)
  expect(componentDServer?.subcomponent.active).toBe(true)

  expect(client.size()).toBe(4)
  expect(server.size()).toBe(4)

  expect(addCallback).toBeCalledTimes(1)
  expect(addCallback).toBeCalledWith("d", componentDClient)
})

test("update component", () => {
  const { server, client } = GetData()

  const updateCallback = vi.fn()
  client.onUpdate(updateCallback)

  const componentBClient = client.get("b")

  const nameUpdateCallback = vi.fn()
  componentBClient.on("name", nameUpdateCallback)

  const subcomponentNameUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("name", subcomponentNameUpdateCallback)

  const subcomponentIdUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("id", subcomponentIdUpdateCallback)

  const subcomponentActiveUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("active", subcomponentActiveUpdateCallback)

  const componentBServer = server.get("b")

  componentBServer.name = "B2"
  componentBServer.subcomponent.name = "subB2"
  componentBServer.subcomponent.id = 22
  componentBServer.subcomponent.active = true

  const recentChanges = server.getRecentChanges()
  server.resetRecentChanges()

  expect(recentChanges).toMatchSnapshot()

  client.applyRecentChanges(recentChanges)

  const newComponentBClient = client.get("b")

  expect(newComponentBClient).toBeDefined()

  expect(newComponentBClient.name).toBe("B2")
  expect(newComponentBClient.subcomponent.name).toBe("subB2")
  expect(newComponentBClient.subcomponent.id).toBe(22)
  expect(newComponentBClient.subcomponent.active).toBe(true)

  expect(nameUpdateCallback).toBeCalledTimes(1)
  expect(nameUpdateCallback).toBeCalledWith("B2")

  expect(subcomponentNameUpdateCallback).toBeCalledTimes(1)
  expect(subcomponentNameUpdateCallback).toBeCalledWith("subB2")

  expect(subcomponentIdUpdateCallback).toBeCalledTimes(1)
  expect(subcomponentIdUpdateCallback).toBeCalledWith(22)

  expect(subcomponentActiveUpdateCallback).toBeCalledTimes(1)
  expect(subcomponentActiveUpdateCallback).toBeCalledWith(true)
})

test("delete component", () => {
  const { server, client } = GetData()

  const deleteCallback = vi.fn()
  client.onRemove(deleteCallback)

  server.delete("b")

  const recentChanges = server.getRecentChanges()
  server.resetRecentChanges()

  expect(recentChanges).toMatchSnapshot()

  client.applyRecentChanges(recentChanges)

  expect(client.size()).toBe(2)
  expect(server.size()).toBe(2)

  expect(client.has("a")).toBe(true)
  expect(client.has("b")).toBe(false)
  expect(client.has("c")).toBe(true)

  expect(server.has("a")).toBe(true)
  expect(server.has("b")).toBe(false)
  expect(server.has("c")).toBe(true)

  expect(deleteCallback).toBeCalledTimes(1)
  expect(deleteCallback).toBeCalledWith("b")
})

test("replace component", () => {
  const { server, client } = GetData()

  const updateCallback = vi.fn()
  client.onUpdate(updateCallback)

  const newComponentBServer = new ComplexComponent()
  newComponentBServer.name = "B2"
  newComponentBServer.subcomponent.name = "subB2"
  newComponentBServer.subcomponent.id = 22
  newComponentBServer.subcomponent.active = true

  server.set("b", newComponentBServer)

  const recentChanges = server.getRecentChanges()
  server.resetRecentChanges()

  expect(recentChanges).toMatchSnapshot()

  const componentBClient = client.get("b")

  const nameUpdateCallback = vi.fn()
  componentBClient.on("name", nameUpdateCallback)

  const subcomponentNameUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("name", subcomponentNameUpdateCallback)

  const subcomponentIdUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("id", subcomponentIdUpdateCallback)

  const subcomponentActiveUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("active", subcomponentActiveUpdateCallback)

  client.applyRecentChanges(recentChanges)

  expect(client.size()).toBe(3)
  expect(server.size()).toBe(3)

  expect(client.has("b")).toBe(true)
  expect(server.has("b")).toBe(true)

  expect(client.get("b")).toBe(componentBClient)

  expect(componentBClient).toBeDefined()

  expect(componentBClient.name).toBe("B2")
  expect(componentBClient.subcomponent.name).toBe("subB2")
  expect(componentBClient.subcomponent.id).toBe(22)
  expect(componentBClient.subcomponent.active).toBe(true)

  expect(nameUpdateCallback).toBeCalledTimes(1)
  expect(nameUpdateCallback).toBeCalledWith("B2")

  expect(subcomponentNameUpdateCallback).toBeCalledTimes(1)
  expect(subcomponentNameUpdateCallback).toBeCalledWith("subB2")

  expect(subcomponentIdUpdateCallback).toBeCalledTimes(1)
  expect(subcomponentIdUpdateCallback).toBeCalledWith(22)

  expect(subcomponentActiveUpdateCallback).toBeCalledTimes(1)
  expect(subcomponentActiveUpdateCallback).toBeCalledWith(true)
})

test("reassign subcomponent", () => {
  const { server, client } = GetData()

  const serverSubcomponent = new SimpleComponent()

  const componentBClient = client.get("b")

  server.get("b").subcomponent = serverSubcomponent

  const recentChanges = server.getRecentChanges()
  server.resetRecentChanges()

  const nameUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("name", nameUpdateCallback)

  const idUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("id", idUpdateCallback)

  const activeUpdateCallback = vi.fn()
  componentBClient.subcomponent.on("active", activeUpdateCallback)

  expect(recentChanges).toMatchSnapshot()

  client.applyRecentChanges(recentChanges)

  expect(client.size()).toBe(3)

  expect(componentBClient).toBeDefined()

  expect(componentBClient.subcomponent.name).toBe(serverSubcomponent.name)
  expect(componentBClient.subcomponent.id).toBe(serverSubcomponent.id)
  expect(componentBClient.subcomponent.active).toBe(serverSubcomponent.active)

  expect(nameUpdateCallback).toBeCalledTimes(1)
  expect(nameUpdateCallback).toBeCalledWith(serverSubcomponent.name)

  expect(idUpdateCallback).toBeCalledTimes(1)
  expect(idUpdateCallback).toBeCalledWith(serverSubcomponent.id)

  expect(activeUpdateCallback).toBeCalledTimes(1)
  expect(activeUpdateCallback).toBeCalledWith(serverSubcomponent.active)
})
