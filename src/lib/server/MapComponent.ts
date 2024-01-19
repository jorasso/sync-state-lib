import { Component, ComponentChangeType } from "./Component"

type AllowedTypes = number | string | boolean

enum MapOperations {
  add = 0,
  remove = 1,
  update = 2,
}

export class MapComponent<T extends AllowedTypes> extends Component {
  private map = new Map<string, T>()

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

  getCompleteState() {
    const state: any = [ComponentChangeType.complete]

    state.push(this.map.size)

    this.map.forEach((value, key) => {
      state.push(key)
      state.push(this.properties.get(key))

      state.push(value)
    })

    return state
  }

  getRecentChanges() {
    const state: any[] = [ComponentChangeType.partial]

    this.primitivePropertiesChanges.forEach((change, numId) => {
      if (change.from === change.to) {
        return
      }

      if (change.to === undefined) {
        state.push(MapOperations.remove)
        state.push(numId)

        return
      }

      if (change.from === undefined) {
        state.push(MapOperations.add)
        state.push(change.meta.key)
        state.push(numId)
        state.push(change.to)
        return
      }

      state.push(MapOperations.update)
      state.push(numId)
      state.push(change.to)
    })

    return state
  }
}
