import { ComponentChangeType, PrimitiveType } from "../common-types/CommonTypes"
import { GetObjectProperty } from "../utils/GetObjectProperty"
import { SetObjectProperty } from "../utils/SetObjectProperty"

// Keeps the change for a child component.
interface ComponentChange {
  isComponent: true
  from: Component
  to: Component
  meta?: any
}

// Keeps the change for a primitive property.
interface PrimitiveChange {
  isComponent: false
  from: PrimitiveType
  to: PrimitiveType
  meta?: any
}

// Component is the base class for all classes that are synced with the client.
// It can contain primitive properties (number, string, boolean) and other sub-components.
export class Component {
  readonly isComponent: boolean = true

  // When class is defined these are set by the decorator, so then we can create proper listeners for the properties and sub-components, when the instance is created.
  static AllSynced = new Set<string>()
  static SyncedComponents = new Set<string>()
  static SyncedProperties = new Set<string>()

  // All properties that are synced with the client in alphabetical order.
  // We use this to get the numerical ids of the properties in the same order as we do on the client side.
  static AllSyncedA_Z = new Array<string>()

  // This way we build a tree of components
  private parentComponent!: Component

  // Both things are set by the parent component.
  private parentNumId!: number
  private parentPropertyKey!: string

  // Child components
  protected components = new Map<Component, number>()

  // Observed properties
  protected properties = new Map<string, number>()

  // All changes that have happened since the last time the last reset. They are in order of how the properties are defined in the class.
  protected changes: (PrimitiveChange | ComponentChange)[] = []

  protected lastNumId: number = 0

  // Flag to avoid reporting the same change to the parent multiple times.
  private updateReportedToParent: boolean

  // We keep the order of the properties in alphabetical order (numId), which is the same in the client.
  // But we also keep the order of the properties in the order they are defined in the class (order).
  // To quickly convert them we keep these two arrays.
  // Definition order is needed to keep calling the listeners on the client the same way they were defined in the class.
  protected numIdToOrder: number[] = []
  protected orderToNumId: number[] = []

  getNumId() {
    const numId = this.lastNumId ?? 0

    this.lastNumId += 1

    return numId
  }

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

    // We want to do the operation just for the first instance of the class to avoid unnecessary work.
    if (allA_Z.length < all.size) {
      allA_Z = Array.from(all).sort()

      SetObjectProperty(this.constructor, "AllSyncedA_Z", allA_Z)
    }

    // Now we create the listeners for the properties and sub-components.
    all.forEach((propertyKey) => {
      const isProperty = properties.has(propertyKey)
      const isComponent = components.has(propertyKey)

      const numId = allA_Z.indexOf(propertyKey)

      const order = this.getNumId()

      this.numIdToOrder[numId] = order
      this.orderToNumId[order] = numId

      if (isProperty) {
        let value = GetObjectProperty(this, propertyKey)

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
      } else if (isComponent) {
        let component = GetObjectProperty(this, propertyKey)

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

    const order = this.numIdToOrder[numId] ?? numId

    let change = this.changes[order]

    if (change) {
      change.to = newValue
    } else {
      change = {
        isComponent: false,
        from: oldValue,
        to: newValue,
      }
      this.changes[order] = change
    }

    if (this.parentComponent && !this.updateReportedToParent) {
      this.updateReportedToParent = true
      this.parentComponent.addChildComponentUpdatedChange(this)
    }

    if (meta) {
      change.meta = meta
    }
  }

  // When the change happens inside the component, we need to report it to the parent component.
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

    const order = this.numIdToOrder[numId] ?? numId

    let change = this.changes[order]

    if (change) {
      change.to = newComponent
    } else {
      change = {
        isComponent: true,
        from: currentComponent,
        to: newComponent,
      }
      this.changes[order] = change
    }

    if (meta) {
      change.meta = meta
    }

    if (this.parentComponent && !this.updateReportedToParent) {
      this.updateReportedToParent = true
      this.parentComponent.addChildComponentUpdatedChange(this)
    }
  }

  // When the child component is overwritten with a new component, we need to report it to the parent component.
  addChildComponentUpdatedChange = (childComponent: Component) => {
    const numId = childComponent.getParentNumId()
    const order = this.numIdToOrder[numId] ?? numId

    let change = this.changes[order]

    if (change) {
      change.to = childComponent
    } else {
      change = {
        isComponent: true,
        from: childComponent,
        to: childComponent,
      }
      this.changes[order] = change
    }

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

  // Create complete state of the component and all its children in form of hierarchical array.
  getCompleteState() {
    const state: any = [ComponentChangeType.complete]

    // Keeps the order of definitions of the properties and sub-components, so the client just processes the changes in the same order as they were defined in the class.
    this.orderToNumId.forEach((numId) => {
      const propertyKey = GetObjectProperty(this.constructor, "AllSyncedA_Z")[
        numId
      ]

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

  // Gets the changes that have happened since the last time the changes were reset.
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

  resetRecentChanges() {
    this.changes = []

    this.updateReportedToParent = false

    this.components.forEach((_, component) => {
      component.resetRecentChanges()
    })
  }
}
