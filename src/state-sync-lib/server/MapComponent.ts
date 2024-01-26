import {
  ComponentChangeType,
  MapOperations,
  PrimitiveType,
} from "../common-types/CommonTypes"
import { Component } from "./Component"

// It's the map of the primitive values, and it's synced with the client's side version.
export class MapComponent<T extends PrimitiveType> extends Component {
  private map = new Map<string, T>()

  forEach(cb: (element: T, key: string) => void) {
    this.map.forEach(cb)
  }

  values() {
    return this.map.values()
  }

  set(key: string, value: T) {
    this.addToProperties(key)

    const numId = this.properties.get(key)

    this.addPrimitivePropertyChange(numId, this.map.get(key), value, { key })

    this.map.set(key, value)
  }

  get(key: string) {
    return this.map.get(key)
  }

  has(key: string) {
    return this.map.has(key)
  }

  delete(key: string) {
    const numId = this.properties.get(key)
    this.addPrimitivePropertyChange(numId, this.map.get(key), undefined)
    this.map.delete(key)
    this.removeFromProperties(key)
  }

  // Make sure the key is added to the properties map and it receives a numId which is used to identify the property in the state when sending it to the client.
  addToProperties = (key: string) => {
    if (this.map.has(key)) {
      return
    }

    const numId = this.getNumId()
    this.properties.set(key, numId)
  }

  removeFromProperties = (key: string) => {
    this.properties.delete(key)
  }

  size() {
    return this.map.size
  }

  // The complete state containing all the properties and their values.
  getCompleteState() {
    const state: any = [ComponentChangeType.complete]

    state.push(this.map.size)

    this.map.forEach((value, key) => {
      const numId = this.properties.get(key)
      state.push(key)
      state.push(numId)

      state.push(value)
    })

    return state
  }

  // Recent changes are the changes that happened since the last time the state was sent to the client.
  getRecentChanges() {
    const state: any[] = [ComponentChangeType.partial]

    this.changes.forEach((change, numId) => {
      if (change.isComponent) {
        return
      }

      // There wre no change
      if (change.from === change.to) {
        return
      }

      // The property was removed
      if (change.to === undefined) {
        state.push(MapOperations.remove)
        state.push(numId)

        return
      }

      // The property was added
      if (change.from === undefined) {
        state.push(MapOperations.add)
        state.push(change.meta.key)
        state.push(numId)
        state.push(change.to)
        return
      }

      // Otherwise, it was updated.
      state.push(MapOperations.update)
      state.push(numId)
      state.push(change.to)
    })

    return state
  }
}
