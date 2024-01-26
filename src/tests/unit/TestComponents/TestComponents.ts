import { Component } from "../../../state-sync-lib/server/Component"
import { Component as ClientComponent } from "../../../state-sync-lib/client/Component"
import {
  Synced,
  SyncedComponent,
  WithSynced,
} from "../../../state-sync-lib/decorators/SyncedDecorator"

@WithSynced
export class SimpleComponent extends Component {
  @Synced() name: string = "Some Name"
  @Synced() id: number = 99
  @Synced() active: boolean = true
}

@WithSynced
export class SimpleComponentClient extends ClientComponent {
  @Synced() active: boolean = false
  @Synced() name: string = ""
  @Synced() id: number = 0
}

@WithSynced
export class ComplexComponent extends Component {
  @Synced() name: string = "Some Name"
  @SyncedComponent() subcomponent: SimpleComponent = new SimpleComponent()
}

@WithSynced
export class ComplexComponentClient extends ClientComponent {
  @Synced() name: string = ""
  @SyncedComponent() subcomponent: SimpleComponentClient =
    new SimpleComponentClient()
}
