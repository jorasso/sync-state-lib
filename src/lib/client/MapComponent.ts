import { ComponentChangeType } from "../server/Component"
import { Component } from "./Component"

type AllowedTypes = number | string | boolean

enum MapOperations {
  add = 0,
  remove = 1,
  update = 2,
}

export class MapComponent<T extends AllowedTypes> extends Component {
  map: Map<string, T> = new Map()

  onAddListeners: ((key: string, value: T) => void)[] = []
  onUpdateListeners: ((key: string, value: T) => void)[] = []
  onRemoveListeners: ((key: string) => void)[] = []

  get(key: string) {
    return this.map.get(key)
  }

  has(key: string) {
    return this.map.has(key)
  }

  onAdd(listener: (key: string, value: T) => void) {
    this.onAddListeners.push(listener)
  }

  emitOnAdd(key: string, value: T) {
    for (const listener of this.onAddListeners) {
      listener(key, value)
    }
  }

  onUpdate(listener: (key: string, value: T) => void) {
    this.onUpdateListeners.push(listener)
  }

  emitOnUpdate(key: string, value: T) {
    for (const listener of this.onUpdateListeners) {
      listener(key, value)
    }
  }

  onRemove(listener: (key: string) => void) {
    this.onRemoveListeners.push(listener)
  }

  emitOnRemove(key: string) {
    for (const listener of this.onRemoveListeners) {
      listener(key)
    }
  }

  size() {
    return this.map.size
  }

  loadCompleteState(state: any[]) {
    this.map.clear()
    this.properties.clear()

    for (let i = 2; i < state.length; i += 3) {
      const key = state[i]
      const numId = state[i + 1]
      const value = state[i + 2]

      this.properties.set(numId, key)

      this.map.set(key, value)

      this.emitOnAdd(key, value)
    }
  }

  applyRecentChanges(data: any[]): void {
    if (data[0] === ComponentChangeType.complete) {
      this.loadCompleteState(data)
      return
    }

    if (data[0] !== ComponentChangeType.partial) {
      return
    }

    for (let i = 1; i < data.length; i += 1) {
      const operation = data[i]

      if (operation === MapOperations.add) {
        const key = data[i + 1]
        const numId = data[i + 2]
        const value = data[i + 3]

        this.properties.set(numId, key)
        this.map.set(key, value)

        this.emitOnAdd(key, value)

        i += 3
      } else if (operation === MapOperations.remove) {
        const numId = data[i + 1]
        const key = this.properties.get(numId)

        this.map.delete(key)
        this.properties.delete(numId)

        this.emitOnRemove(key)

        i += 1
      } else if (operation === MapOperations.update) {
        const numId = data[i + 1]
        const value = data[i + 2]

        const key = this.properties.get(numId)

        this.map.set(key, value)

        this.emitOnUpdate(key, value)

        i += 1
      }
    }
  }
}
