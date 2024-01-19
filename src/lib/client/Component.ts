import { ComponentChangeType } from "../server/Component"
import { GetObjectProperty } from "../utils/GetObjectProperty"
import { SetObjectProperty } from "../utils/SetObjectProperty"

export class Component {
  static AllSyncedAlphabeticalOrder: string[] = []
  static AllSynced: string[] = []
  static SyncedComponents: string[] = []
  static SyncedProperties: string[] = []

  protected components = new Map<number, Component>()

  protected properties = new Map<number, string>()

  private listeners = new Map<string, Array<(value: any) => void>>()

  private parentComponent!: Component
  private parentNumId!: number
  private parentPropertyKey!: string

  makeSynced() {
    const properties: string[] =
      GetObjectProperty(this.constructor, "SyncedProperties") ?? []
    const components: string[] =
      GetObjectProperty(this.constructor, "SyncedComponents") ?? []
    const all: string[] = GetObjectProperty(this.constructor, "AllSynced") ?? []
    const allOrder: string[] = [...all].sort()

    all.forEach((propertyKey) => {
      const isProperty = properties.includes(propertyKey)
      const numId = allOrder.indexOf(propertyKey)

      if (isProperty) {
        this.properties.set(numId, propertyKey)
      } else {
        let component = GetObjectProperty(this, propertyKey) as Component

        this.components.set(numId, component)
      }
    })
  }

  setParent(
    parentComponent: Component,
    parentNumId: number,
    parentPropertyKey?: string
  ) {
    this.parentComponent = parentComponent
    this.parentNumId = parentNumId

    if (parentPropertyKey) {
      this.parentPropertyKey = parentPropertyKey
    }
  }

  getParentComponent() {
    return this.parentComponent
  }

  getParentNumId() {
    return this.parentNumId
  }

  getParentPropertyKey() {
    return this.parentPropertyKey
  }

  loadCompleteStateBKP(state: any[]) {
    if (state[0] !== ComponentChangeType.complete) {
      return
    }

    const valuesSize = state[1]

    for (let i = 1; i < state.length; i += 3) {
      const key = state[i]
      const numId = state[i + 1]
      const value = state[i + 2]

      const isComponent = i >= 1 + valuesSize * 3

      if (isComponent) {
        //@ts-ignore
        const component = this[key]
        this.components.set(numId, component)
        component.setParent(this, key, numId)

        component.loadCompleteState(value)
      } else {
        this.properties.set(numId, key)
        //@ts-ignore
        this[key] = value

        this.emitOn(key, value)
      }
    }
  }

  loadCompleteState(state: any[]) {
    if (state[0] !== ComponentChangeType.complete) {
      return
    }

    for (let i = 1; i < state.length; i += 2) {
      const numId = state[i]
      const data = state[i + 1]

      const isComponent = this.components.has(numId)

      if (isComponent) {
        const component = this.components.get(numId)
        component.setParent(this, numId)

        component.loadCompleteState(data)
      } else {
        const key = this.properties.get(numId)
        //@ts-ignore
        this[key] = data

        this.emitOn(key, data)
      }
    }
  }

  on(key: string, callback: (value: any) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }

    this.listeners.get(key).push(callback)
  }

  private emitOn = (key: string, value: any) => {
    if (!this.listeners.has(key)) {
      return
    }

    const listeners = this.listeners.get(key)

    for (const listener of listeners) {
      listener(value)
    }
  }

  applyRecentChanges(changes: any[]) {
    if (changes[0] === ComponentChangeType.complete) {
      this.loadCompleteState(changes)
      return
    }

    if (changes[0] !== ComponentChangeType.partial) {
      return
    }

    for (let i = 1; i < changes.length; i += 2) {
      const numId = changes[i]
      const data = changes[i + 1]

      const isComponent = this.components.has(numId)

      if (isComponent) {
        const component = this.components.get(numId)
        component.applyRecentChanges(data)
      } else if (this.properties.has(numId)) {
        const key = this.properties.get(numId)
        //@ts-ignore
        this[key] = data

        this.emitOn(key, data)
      }
    }
  }

  applyRecentChangesBKP(data: any[]) {
    if (data[0] === ComponentChangeType.complete) {
      this.loadCompleteState(data)
      return
    }

    if (data[0] !== ComponentChangeType.partial) {
      return
    }

    for (let i = 1; i < data.length; i += 2) {
      const numId = data[i]
      const value = data[i + 1]

      if (this.components.has(numId)) {
        const component = this.components.get(numId)
        component.applyRecentChanges(value)
      } else if (this.properties.has(numId)) {
        const key = this.properties.get(numId)
        const value = data[i + 1]

        SetObjectProperty(this, key, value)
        this.emitOn(key, value)
      }
    }
  }
}
