import { ComponentsMapComponent as ComponentsMapComponentServer } from "../../../server/ComponentsMapComponent"
import { Component as ComponentServer } from "../../../server/Component"
import { MapComponent as MapComponentServer } from "../../../server/MapComponent"

import { ComponentsMapComponent as ComponentsMapComponentClient } from "../../../client/ComponentsMapComponent"
import { Component as ComponentClient } from "../../../client/Component"
import { MapComponent as MapComponentClient } from "../../../client/MapComponent"

import {
  Synced,
  SyncedComponent,
  WithSynced,
} from "../../../server/SyncedDecorator"

// Define the components on the server
@WithSynced
export class ActiveSlotServer extends ComponentServer {
  @Synced() id: string = ""
  @Synced() active: boolean = false
}

@WithSynced
export class InventoryServer extends ComponentServer {
  @SyncedComponent() items: MapComponentServer<number> =
    new MapComponentServer<number>()
  @SyncedComponent()
  activeSlots: ComponentsMapComponentServer<ActiveSlotServer> =
    new ComponentsMapComponentServer<ActiveSlotServer>(ActiveSlotServer)
}

@WithSynced
export class AimingServer extends ComponentServer {
  @Synced() angle: number = 0
  @Synced() active: boolean = false
}

@WithSynced
export class HeroServer extends ComponentServer {
  @Synced() name: string = "Default Hero Name"
  @Synced() x: number = 0
  @Synced() y: number = 0
  @SyncedComponent() inventory: InventoryServer = new InventoryServer()
  @SyncedComponent() aiming: AimingServer = new AimingServer()
}

// Define the components on the client (just copy in practice, here we have Server and Client)
@WithSynced
export class ActiveSlotClient extends ComponentClient {
  @Synced() id: string = ""
  @Synced() active: boolean = false
}

@WithSynced
export class InventoryClient extends ComponentClient {
  @SyncedComponent() items: MapComponentClient<number> =
    new MapComponentClient<number>()
  @SyncedComponent()
  activeSlots: ComponentsMapComponentClient<ActiveSlotClient> =
    new ComponentsMapComponentClient<ActiveSlotClient>(ActiveSlotClient)
}

@WithSynced
export class AimingClient extends ComponentClient {
  @Synced() angle: number = 0
  @Synced() active: boolean = false
}

@WithSynced
export class HeroClient extends ComponentClient {
  @Synced() name: string = "Default Hero Name"
  @Synced() x: number = 0
  @Synced() y: number = 0
  @SyncedComponent() inventory: InventoryClient = new InventoryClient()
  @SyncedComponent() aiming: AimingClient = new AimingClient()
}
