import { ComponentChangeType, MapOperations } from "../common-types/CommonTypes"
import { Component } from "./Component"

export class ComponentsMapComponent<T extends Component> extends Component {
  map: Map<string, T> = new Map()

  numIdToKey = new Map<number, string>()

  onAddListeners: ((key: string, value: T) => void)[] = []
  onUpdateListeners: ((key: string, value: T) => void)[] = []
  onRemoveListeners: ((key: string) => void)[] = []

  private instanceConstructor: { new (): T }

  constructor(instanceConstructor: { new (): T }) {
    super()
    this.instanceConstructor = instanceConstructor
  }

  private createInstance(): T {
    return new this.instanceConstructor()
  }

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

  forEach(cb: (element: T, key: string) => void) {
    this.map.forEach(cb)
  }

  values() {
    return this.map.values()
  }

  size() {
    return this.map.size
  }

  loadCompleteState(state: any[]) {
    this.map.clear()
    this.components.clear()

    for (let i = 2; i < state.length; i += 3) {
      const key = state[i]
      const numId = state[i + 1]
      const data = state[i + 2]

      const component = this.createInstance()

      component.setParent(this, numId, key)
      component.loadCompleteState(data)

      this.components.set(numId, component)

      this.map.set(key, component)

      this.emitOnAdd(key, component)
      component.loadCompleteState(data)
    }
  }

  applyRecentChanges(changes: any[]): void {
    if (changes[0] === ComponentChangeType.complete) {
      this.loadCompleteState(changes)
      return
    }

    if (changes[0] !== ComponentChangeType.partial) {
      return
    }

    for (let i = 1; i < changes.length; i += 1) {
      const operation = changes[i]

      if (operation === MapOperations.add) {
        const key = changes[i + 1]
        const numId = changes[i + 2]
        const data = changes[i + 3]

        const component = this.createInstance()
        component.setParent(this, numId, key)

        // Load complete state first, so the component has proper data before we call onAdd callbacks
        component.loadCompleteState(data)

        this.components.set(numId, component)
        this.map.set(key, component)

        this.emitOnAdd(key, component)

        // Load the component again, so it can fire all the callbacks
        component.loadCompleteState(data)

        i += 3
      } else if (operation === MapOperations.replace) {
        const numId = changes[i + 1]
        const data = changes[i + 2]

        const component = this.components.get(numId)

        component.loadCompleteState(data)

        const key = component.getParentPropertyKey()

        this.emitOnUpdate(key, component as T)

        i += 2
      } else if (operation === MapOperations.remove) {
        const numId = changes[i + 1]

        const component = this.components.get(numId)

        const key = component.getParentPropertyKey()

        this.map.delete(key)
        this.components.delete(numId)

        this.emitOnRemove(key)

        i += 1
      } else if (operation === MapOperations.update) {
        const numId = changes[i + 1]
        const data = changes[i + 2]

        const component = this.components.get(numId)

        component.applyRecentChanges(data)

        const key = component.getParentPropertyKey()

        this.emitOnUpdate(key, component as T)

        i += 1
      }
    }
  }
}
