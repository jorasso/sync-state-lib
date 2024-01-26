import { ComponentChangeType } from "../common-types/CommonTypes"
import { GetObjectProperty } from "../utils/GetObjectProperty"
import { SetObjectProperty } from "../utils/SetObjectProperty"

export class Component {
  static AllSyncedA_Z = new Array<string>()
  static AllSynced = new Set<string>()
  static SyncedComponents = new Set<string>()
  static SyncedProperties = new Set<string>()

  protected components = new Map<number, Component>()

  protected properties = new Map<number, string>()

  private listeners = new Map<string, Array<(value: any) => void>>()

  private parentComponent!: Component
  private parentNumId!: number
  private parentPropertyKey!: string

  makeSynced() {
    const properties: Set<string> =
      GetObjectProperty(this.constructor, "SyncedProperties") ??
      new Set<string>()
    const components: Set<string> =
      GetObjectProperty(this.constructor, "SyncedComponents") ??
      new Set<string>()
    const all: Set<string> =
      GetObjectProperty(this.constructor, "AllSynced") ?? new Set<string>()

    let allA_Z: Array<string> =
      GetObjectProperty(this.constructor, "AllSyncedA_Z") ?? new Array<string>()

    if (allA_Z.length < all.size) {
      allA_Z = Array.from(all).sort()

      SetObjectProperty(this.constructor, "AllSyncedA_Z", allA_Z)
    }

    all.forEach((propertyKey) => {
      const isProperty = properties.has(propertyKey)
      const isComponent = components.has(propertyKey)

      const numId = allA_Z.indexOf(propertyKey)

      if (isProperty) {
        this.properties.set(numId, propertyKey)
      } else if (isComponent) {
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

        SetObjectProperty(this, key, data)

        this.emitOn(key, data)
      }
    }
  }

  on<K extends keyof this>(
    propertyKey: K,
    callback: (value: this[K]) => void
  ): void {
    const key = propertyKey as string

    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }

    this.listeners.get(key).push(callback)
  }

  /*on(key: string, callback: (value: any) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }

    this.listeners.get(key).push(callback)
  }*/

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

        SetObjectProperty(this, key, data)

        this.emitOn(key, data)
      }
    }
  }
}
