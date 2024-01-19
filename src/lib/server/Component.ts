import { GetObjectProperty } from "../utils/GetObjectProperty"

export enum ComponentChangeType {
  "complete" = 1,
  "partial" = 2,
}

interface ComponentChange {
  isComponent: true
  from: Component
  to: Component
  meta?: any
}

interface PrimitiveChange {
  isComponent: false
  from: number | string | boolean
  to: number | string | boolean
  meta?: any
}

export class Component {
  readonly isComponent: boolean = true

  static AllSyncedAlphabeticalOrder: string[] = []
  static AllSynced: string[] = []
  static SyncedComponents: string[] = []
  static SyncedProperties: string[] = []

  // This way we build a tree of components
  private parentComponent!: Component

  // Both things are set by the parent component.
  private parentNumId!: number
  private parentPropertyKey!: string

  // Child components
  protected components = new Map<Component, number>()

  // Observed properties
  protected properties = new Map<string, number>()

  protected primitivePropertiesChanges: Map<number, PrimitiveChange> = new Map()
  protected childComponentsChanges: Map<number, ComponentChange> = new Map()

  protected changes: (PrimitiveChange | ComponentChange)[] = []

  protected lastNumId: number = 0

  private updateReportedToParent: boolean = false

  private numIdToOrder: number[] = []
  private orderToNumId: number[] = []

  private allPropertyKeys: string[] = []

  getNumId() {
    const numId = this.lastNumId ?? 0

    this.lastNumId += 1

    return numId
  }

  makeSynced() {
    const properties: string[] =
      GetObjectProperty(this.constructor, "SyncedProperties") ?? []
    const components: string[] =
      GetObjectProperty(this.constructor, "SyncedComponents") ?? []
    const all: string[] = GetObjectProperty(this.constructor, "AllSynced") ?? []
    const allOrder: string[] = [...all].sort()

    this.allPropertyKeys = allOrder

    all.forEach((propertyKey) => {
      const isProperty = properties.includes(propertyKey)
      const numId = allOrder.indexOf(propertyKey)

      const order = this.getNumId()

      if (isProperty) {
        let value = GetObjectProperty(this, propertyKey)

        this.numIdToOrder[numId] = order
        this.orderToNumId[order] = numId

        this.properties.set(propertyKey, numId)

        Object.defineProperty(this, propertyKey, {
          get: () => {
            return value
          },
          set: (newValue: any) => {
            this.addPrimitivePropertyChange(numId, value, newValue)

            value = newValue
          },
          enumerable: true,
          configurable: true,
        })
      } else {
        let component = GetObjectProperty(this, propertyKey)

        this.numIdToOrder[numId] = order
        this.orderToNumId[order] = numId

        this.components.set(component, numId)

        if (component?.isComponent) {
          component.setParent(this, propertyKey, numId)
        }

        Object.defineProperty(this, propertyKey, {
          get: () => {
            return component
          },
          set: (newComponent: Component) => {
            const numId = component?.parentNumId ?? this.getNumId()

            if (component) {
              component.dispose()
            }

            if (newComponent) {
              newComponent.setParent(this, propertyKey, numId)
            }

            this.addChildComponentPropertyChange(numId, component, newComponent)

            component = newComponent
          },
          enumerable: true,
          configurable: true,
        })
      }
    })
  }

  makeSyncedBKP() {
    const properties: string[] =
      GetObjectProperty(this.constructor, "SyncedProperties") ?? []
    const components: string[] =
      GetObjectProperty(this.constructor, "SyncedComponents") ?? []
    const all: string[] = GetObjectProperty(this.constructor, "AllSynced") ?? []

    properties.forEach((propertyKey) => {
      let value = GetObjectProperty(this, propertyKey)
      let numId = this.getNumId()

      this.properties.set(propertyKey, numId)

      Object.defineProperty(this, propertyKey, {
        get: () => {
          return value
        },
        set: (newValue: any) => {
          this.addPrimitivePropertyChange(numId, value, newValue)

          value = newValue
        },
        enumerable: true,
        configurable: true,
      })
    })

    components.forEach((propertyKey) => {
      let component = GetObjectProperty(this, propertyKey)

      const numId = this.getNumId()
      this.components.set(component, numId)

      if (component?.isComponent) {
        component.setParent(this, propertyKey, numId)
      }

      Object.defineProperty(this, propertyKey, {
        get: () => {
          return component
        },
        set: (newComponent: Component) => {
          const numId = component?.parentNumId ?? this.getNumId()

          if (component) {
            component.dispose()
          }

          if (newComponent) {
            newComponent.setParent(this, propertyKey, numId)
          }

          this.addChildComponentPropertyChange(numId, component, newComponent)

          component = newComponent
        },
        enumerable: true,
        configurable: true,
      })
    })
  }

  // If the value of a property changes, or the property that holds a component is reassigned
  addPrimitivePropertyChange = (
    numId: number,
    oldValue: any,
    newValue: any,
    meta?: any
  ) => {
    if (oldValue === newValue) {
      return
    }

    let change = this.primitivePropertiesChanges.get(numId)

    if (change) {
      change.to = newValue
    } else {
      change = {
        isComponent: false,
        from: oldValue,
        to: newValue,
      }

      this.primitivePropertiesChanges.set(numId, change)
    }

    this.changes[this.numIdToOrder[numId]] = change

    if (this.parentComponent && !this.updateReportedToParent) {
      this.updateReportedToParent = true
      this.parentComponent.addChildComponentUpdatedChange(this)
    }

    if (meta) {
      change.meta = meta
    }
  }

  addChildComponentPropertyChange = (
    numId: number,
    currentComponent: Component,
    newComponent: Component,
    meta?: any
  ) => {
    if (currentComponent) {
      this.components.delete(currentComponent)
    }

    if (newComponent) {
      this.components.set(newComponent, numId)
    }

    let change = this.childComponentsChanges.get(numId)

    if (change) {
      change.to = newComponent
    } else {
      change = {
        isComponent: true,
        from: currentComponent,
        to: newComponent,
      }
      this.childComponentsChanges.set(numId, change)
    }

    if (meta) {
      change.meta = meta
    }

    this.changes[this.numIdToOrder[numId]] = change

    if (this.parentComponent && !this.updateReportedToParent) {
      this.updateReportedToParent = true
      this.parentComponent.addChildComponentUpdatedChange(this)
    }
  }

  addChildComponentUpdatedChange = (childComponent: Component) => {
    const numId = childComponent.getParentNumId()
    let change = this.childComponentsChanges.get(numId)

    if (change) {
      change.to = childComponent
    } else {
      change = {
        isComponent: true,
        from: childComponent,
        to: childComponent,
      }
      this.childComponentsChanges.set(numId, change)
    }

    this.changes[this.numIdToOrder[numId]] = change

    if (this.parentComponent && !this.updateReportedToParent) {
      this.updateReportedToParent = true
      this.parentComponent.addChildComponentUpdatedChange(this)
    }
  }

  setParent(
    parentComponent: Component,
    parentPropertyKey: string,
    parentNumId: number
  ) {
    this.parentComponent = parentComponent
    this.parentPropertyKey = parentPropertyKey
    this.parentNumId = parentNumId
  }

  getParent() {
    return this.parentComponent
  }

  getParentPropertyKey() {
    return this.parentPropertyKey
  }

  getParentNumId() {
    return this.parentNumId
  }

  dispose() {
    this.parentComponent = undefined
    this.parentPropertyKey = undefined
    this.parentNumId = undefined
  }

  getCompleteState() {
    const state: any = [ComponentChangeType.complete]

    this.orderToNumId.forEach((numId, order) => {
      const propertyKey = this.allPropertyKeys[numId]

      const isProperty = this.properties.has(propertyKey)

      if (isProperty) {
        const property = GetObjectProperty(this, propertyKey)

        state.push(numId)
        state.push(property)
      } else {
        const component = GetObjectProperty(this, propertyKey) as Component

        if (component) {
          state.push(numId)
          state.push(component.getCompleteState())
        }
      }
    })

    return state
  }

  getCompleteStateBKP() {
    const state: any = [ComponentChangeType.complete]

    state.push(this.properties.size)

    this.properties.forEach((numId, key) => {
      state.push(key)
      state.push(numId)

      state.push(GetObjectProperty(this, key))
    })

    this.components.forEach((numId, component) => {
      state.push(component.getParentPropertyKey())
      state.push(numId)
      state.push(component.getCompleteState())
    })

    return state
  }

  getRecentChanges() {
    const changes: any = [ComponentChangeType.partial]

    this.changes.forEach((change, order) => {
      const numId = this.orderToNumId[order]

      if (change.isComponent) {
        if (change.from === change.to) {
          const recentChanges = change.to.getRecentChanges()

          // Don't include empty changes (only contains the type of change as partial, and no actual changes)
          if (recentChanges.length > 1) {
            changes.push(numId)
            changes.push(recentChanges)
          }
        } else {
          changes.push(numId)
          changes.push(change.to.getCompleteState())
        }
      } else {
        if (change.from === change.to) {
          return
        }
        changes.push(numId)
        changes.push(change.to)
      }
    })

    return changes
  }

  getRecentChangesBKP() {
    const changes: any = [ComponentChangeType.partial]

    this.primitivePropertiesChanges.forEach((change, numId) => {
      if (change.from === change.to) {
        return
      }
      changes.push(numId)
      changes.push(change.to)
    })

    this.childComponentsChanges.forEach((change, numId) => {
      if (change.from === change.to) {
        const recentChanges = change.to.getRecentChanges()

        // Don't include empty changes (only contains the type of change as partial, and no actual changes)
        if (recentChanges.length > 1) {
          changes.push(numId)
          changes.push(change.to.getRecentChanges())
        }
      } else {
        changes.push(numId)
        changes.push(change.to.getCompleteState())
      }
    })

    return changes
  }

  resetRecentChanges() {
    this.changes = []

    this.updateReportedToParent = false

    this.primitivePropertiesChanges.clear()
    this.childComponentsChanges.clear()

    this.components.forEach((_, component) => {
      component.resetRecentChanges()
    })
  }
}
