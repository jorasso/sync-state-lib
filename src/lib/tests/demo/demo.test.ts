import { ComponentsMapComponent as ComponentsMapComponentServer } from "../../server/ComponentsMapComponent"
import { ComponentsMapComponent as ComponentsMapComponentClient } from "../../client/ComponentsMapComponent"

import {
  HeroServer,
  HeroClient,
  ActiveSlotServer,
  ActiveSlotClient,
} from "./components/DemoComponents"
import { expect, test, vi } from "vitest"

const GetData = () => {
  const server = new ComponentsMapComponentServer<HeroServer>(HeroServer)
  const client = new ComponentsMapComponentClient<HeroClient>(HeroClient)

  const heroServer = new HeroServer()
  heroServer.name = "Hero A"
  heroServer.x = 2000
  heroServer.y = 4000

  heroServer.inventory.items.set("A", 1)
  heroServer.inventory.items.set("B", 2)
  heroServer.inventory.items.set("C", 3)

  const activeSlotServer = new ActiveSlotServer()
  activeSlotServer.id = "AA"
  activeSlotServer.active = true

  heroServer.inventory.activeSlots.set("A", activeSlotServer)

  heroServer.aiming.angle = 90
  heroServer.aiming.active = true

  server.set("heroA", heroServer)

  const state = server.getCompleteState()

  client.loadCompleteState(state)

  server.resetRecentChanges()

  return { server, client, state }
}

test("complete state", () => {
  const { server, client, state } = GetData()

  // Check if server state is correct
  expect(server.has("heroA")).toBe(true)

  expect(server.get("heroA")).toBeDefined()

  expect(server.get("heroA").name).toBe("Hero A")
  expect(server.get("heroA").x).toBe(2000)
  expect(server.get("heroA").y).toBe(4000)

  expect(server.get("heroA").inventory.items.get("A")).toBe(1)
  expect(server.get("heroA").inventory.items.get("B")).toBe(2)
  expect(server.get("heroA").inventory.items.get("C")).toBe(3)

  expect(server.get("heroA").inventory.activeSlots.get("A")).toBeDefined()

  expect(server.get("heroA").inventory.activeSlots.get("A").id).toBe("AA")
  expect(server.get("heroA").inventory.activeSlots.get("A").active).toBe(true)

  expect(server.get("heroA").aiming.angle).toBe(90)
  expect(server.get("heroA").aiming.active).toBe(true)

  expect(server.size()).toBe(1)

  // Check if full state data is correct
  expect(state).toMatchSnapshot()

  // Check if client state is the same as the server state
  expect(client.has("heroA")).toBe(true)

  expect(client.get("heroA")).toBeDefined()

  expect(client.get("heroA").name).toBe("Hero A")
  expect(client.get("heroA").x).toBe(2000)
  expect(client.get("heroA").y).toBe(4000)

  expect(client.get("heroA").inventory.items.get("A")).toBe(1)
  expect(client.get("heroA").inventory.items.get("B")).toBe(2)
  expect(client.get("heroA").inventory.items.get("C")).toBe(3)

  expect(client.get("heroA").inventory.activeSlots.get("A")).toBeDefined()

  expect(client.get("heroA").inventory.activeSlots.get("A").id).toBe("AA")
  expect(client.get("heroA").inventory.activeSlots.get("A").active).toBe(true)

  expect(client.get("heroA").aiming.angle).toBe(90)
  expect(client.get("heroA").aiming.active).toBe(true)

  expect(client.size()).toBe(1)
})

test("callbacks for complete state", () => {
  const { client, state } = GetData()

  // Create callbacks for the client
  const addCallback = vi.fn()

  const nameUpdateCallback = vi.fn()
  const xUpdateCallback = vi.fn()
  const yUpdateCallback = vi.fn()
  const inventoryItemsAddCallback = vi.fn()
  const activeSlotsAddCallback = vi.fn()

  const idUpdateCallback = vi.fn()
  const activeUpdateCallback = vi.fn()

  const aimingAngleUpdateCallback = vi.fn()
  const aimingActiveUpdateCallback = vi.fn()

  client.onAdd((key: string, hero: HeroClient) => {
    addCallback(key, hero)

    // Create callbacks for the hero
    hero.on("name", nameUpdateCallback)

    hero.on("x", xUpdateCallback)

    hero.on("y", yUpdateCallback)

    hero.inventory.items.onAdd(inventoryItemsAddCallback)

    hero.inventory.activeSlots.onAdd(
      (key: string, activeSlot: ActiveSlotClient) => {
        activeSlotsAddCallback(key, activeSlot)

        activeSlot.on("id", idUpdateCallback)

        activeSlot.on("active", activeUpdateCallback)
      }
    )

    hero.aiming.on("angle", aimingAngleUpdateCallback)

    hero.aiming.on("active", aimingActiveUpdateCallback)
  })

  // It should reset client state and call all callbacks
  client.loadCompleteState(state)

  // Check if the callbacks are called with the correct values
  expect(addCallback).toHaveBeenCalledTimes(1)
  expect(addCallback).toHaveBeenCalledWith("heroA", client.get("heroA"))

  expect(nameUpdateCallback).toHaveBeenCalledTimes(1)
  expect(nameUpdateCallback).toHaveBeenCalledWith("Hero A")

  expect(xUpdateCallback).toHaveBeenCalledTimes(1)
  expect(xUpdateCallback).toHaveBeenCalledWith(2000)

  expect(yUpdateCallback).toHaveBeenCalledTimes(1)
  expect(yUpdateCallback).toHaveBeenCalledWith(4000)

  expect(inventoryItemsAddCallback).toHaveBeenCalledTimes(3)
  expect(inventoryItemsAddCallback).toHaveBeenCalledWith("A", 1)
  expect(inventoryItemsAddCallback).toHaveBeenCalledWith("B", 2)
  expect(inventoryItemsAddCallback).toHaveBeenCalledWith("C", 3)

  expect(activeSlotsAddCallback).toHaveBeenCalledTimes(1)
  expect(activeSlotsAddCallback).toHaveBeenCalledWith(
    "A",
    client.get("heroA").inventory.activeSlots.get("A")
  )

  expect(idUpdateCallback).toHaveBeenCalledTimes(1)
  expect(idUpdateCallback).toHaveBeenCalledWith("AA")

  expect(activeUpdateCallback).toHaveBeenCalledTimes(1)
  expect(activeUpdateCallback).toHaveBeenCalledWith(true)

  expect(aimingAngleUpdateCallback).toHaveBeenCalledTimes(1)
  expect(aimingAngleUpdateCallback).toHaveBeenCalledWith(90)

  expect(aimingActiveUpdateCallback).toHaveBeenCalledTimes(1)
  expect(aimingActiveUpdateCallback).toHaveBeenCalledWith(true)
})

test("run and aim", () => {
  const { server, client } = GetData()

  // Update the server state
  server.get("heroA").x = 3000
  server.get("heroA").y = 5000

  server.get("heroA").aiming.angle = 180

  // Check if the server state is correct
  expect(server.get("heroA").x).toBe(3000)
  expect(server.get("heroA").y).toBe(5000)

  expect(server.get("heroA").aiming.angle).toBe(180)

  // Send changes to the client
  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  client.applyRecentChanges(changes)

  // Check if the client state is the same as the server state
  expect(client.get("heroA").x).toBe(server.get("heroA").x)
  expect(client.get("heroA").y).toBe(server.get("heroA").y)

  expect(client.get("heroA").aiming.angle).toBe(
    server.get("heroA").aiming.angle
  )
})

test("collect items", () => {
  const { server, client } = GetData()

  // Update the server state
  server.get("heroA").inventory.items.set("D", 4)

  // Check if the server state is correct
  expect(server.get("heroA").inventory.items.get("D")).toBe(4)
  expect(server.get("heroA").inventory.items.size()).toBe(4)

  // Send changes to the client
  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  expect(changes).toMatchSnapshot()

  client.applyRecentChanges(changes)

  // Check if the client state is the same as the server state
  expect(client.get("heroA").inventory.items.get("D")).toBe(
    server.get("heroA").inventory.items.get("D")
  )
  expect(client.get("heroA").inventory.items.size()).toBe(
    server.get("heroA").inventory.items.size()
  )
})

test("drop items", () => {
  const { server, client } = GetData()

  // Update the server state
  server.get("heroA").inventory.items.delete("A")

  // Check if the server state is correct
  expect(server.get("heroA").inventory.items.get("A")).toBeUndefined()
  expect(server.get("heroA").inventory.items.size()).toBe(2)

  // Send changes to the client
  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  client.applyRecentChanges(changes)

  // Check if the client state is the same as the server state
  expect(client.get("heroA").inventory.items.get("A")).toBeUndefined()
  expect(client.get("heroA").inventory.items.size()).toBe(2)
})

test("drop one item", () => {
  const { server, client } = GetData()

  // Update the server state
  server.get("heroA").inventory.items.set("C", 1)

  // Check if the server state is correct
  expect(server.get("heroA").inventory.items.get("C")).toBe(1)
  expect(server.get("heroA").inventory.items.size()).toBe(3)

  // Send changes to the client
  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  client.applyRecentChanges(changes)

  // Check if the client state is the same as the server state
  expect(client.get("heroA").inventory.items.get("C")).toBe(1)
  expect(client.get("heroA").inventory.items.size()).toBe(3)
})

test("collect new active slot", () => {
  const { server, client } = GetData()

  // Update the server state
  const activeSlotServer = new ActiveSlotServer()
  activeSlotServer.id = "ZZZ"
  activeSlotServer.active = false

  server.get("heroA").inventory.activeSlots.set("ZZZ", activeSlotServer)

  // Check if the server state is correct
  expect(server.get("heroA").inventory.activeSlots.get("ZZZ")).toBeDefined()
  expect(server.get("heroA").inventory.activeSlots.size()).toBe(2)

  // Send changes to the client
  const changes = server.getRecentChanges()
  server.resetRecentChanges()

  client.applyRecentChanges(changes)

  // Check if the client state is the same as the server state
  expect(client.get("heroA").inventory.activeSlots.get("ZZZ")).toBeDefined()
  expect(client.get("heroA").inventory.activeSlots.size()).toBe(2)
})
