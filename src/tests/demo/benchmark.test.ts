import { bench, test } from "vitest"
import { ComponentsMapComponent as ComponentsMapComponentServer } from "../../state-sync-lib/server/ComponentsMapComponent"
import { ComponentsMapComponent as ComponentsMapComponentClient } from "../../state-sync-lib/client/ComponentsMapComponent"
import {
  ActiveSlotServer,
  HeroClient,
  HeroServer,
} from "./components/DemoComponents"

test("benchmark", () => {
  const benchmark = () => {
    const server = new ComponentsMapComponentServer<HeroServer>(HeroServer)
    const client = new ComponentsMapComponentClient<HeroClient>(HeroClient)

    const heroesNum = 100
    const x = []
    const y = []
    const animngAngle = []

    for (let i = 0; i < heroesNum; i++) {
      const heroServer = new HeroServer()
      const heroClient = new HeroClient()

      heroServer.name = `Hero ${i + Math.random()}`
      heroServer.x = Math.random() * 1000
      heroServer.y = Math.random() * 1000

      heroServer.inventory.items.set("A", 1)
      heroServer.inventory.items.set("B", 2)
      heroServer.inventory.items.set("C", 3)

      const activeSlotServer = new ActiveSlotServer()
      activeSlotServer.id = "weapon"
      activeSlotServer.active = true
      activeSlotServer.ammo = 999

      heroServer.inventory.activeSlots.set("weapon", activeSlotServer)

      x.push(heroServer.x + Math.random() * 1000)
      y.push(heroServer.x + Math.random() * 1000)
      animngAngle.push(Math.random() * 360)

      server.set("Hero " + i, heroServer)
    }

    const timeA = performance.now()

    const state = server.getCompleteState()

    console.log("Complete state took", performance.now() - timeA, "ms")

    const timeB = performance.now()

    for (let i = 0; i < heroesNum; i++) {
      const heroServer = server.get("Hero " + i)

      heroServer.x = x[i]
      heroServer.y = y[i]

      heroServer.aiming.angle = animngAngle[i]

      heroServer.inventory.activeSlots.get("weapon").ammo -= 1
    }

    console.log("Applying changes took", performance.now() - timeB, "ms")

    const timeC = performance.now()

    const changes = server.getRecentChanges()

    console.log("Getting changes took", performance.now() - timeC, "ms")
  }

  for (let i = 0; i < 10; i++) benchmark()
})
