import { ComponentChangeType, MapOperations } from "../common-types/CommonTypes"
import { Component } from "./Component"

// It's the map of the components, it is synced with the client's side version.
// Supports operations like add, remove, update, replace.
export class ComponentsMapComponent<T extends Component> extends Component {
  private map = new Map<string, T>()

  // Just to have the same signature as client's ComponentsMapComponent
  constructor(_: { new (): T }) {
    super()
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

  set(key: string, component: T) {
    const currentComponent = this.map.get(key)

    if (currentComponent === component) {
      return
    }

    this.addToComponents(key, component, currentComponent?.getParentNumId())

    const numId = component.getParentNumId()

    this.addChildComponentPropertyChange(numId, currentComponent, component, {
      key,
    })

    currentComponent?.dispose()

    this.map.set(key, component)
  }

  get(key: string) {
    return this.map.get(key)
  }

  has(key: string) {
    return this.map.has(key)
  }

  delete(key: string) {
    const currentComponent = this.map.get(key)

    this.addChildComponentPropertyChange(
      currentComponent.getParentNumId(),
      currentComponent,
      undefined
    )

    currentComponent?.dispose()
    this.map.delete(key)
    this.removeFromComponents(currentComponent)
  }

  addToComponents = (
    key: string,
    component: Component,
    existingNumId: number
  ) => {
    const numId = existingNumId ?? this.getNumId()
    this.components.set(component, numId)
    component.setParent(this, key, numId)
  }

  removeFromComponents = (component: Component) => {
    this.components.delete(component)
  }

  getCompleteState() {
    const state: any[] = [ComponentChangeType.complete]

    state.push(this.map.size)

    this.map.forEach((component, key) => {
      state.push(key)
      state.push(this.components.get(component))

      state.push(component.getCompleteState())
    })

    return state
  }

  // Collects are changes from the map and from the components it contains.
  getRecentChanges() {
    const state: any[] = [ComponentChangeType.partial]

    this.changes.forEach((change, numId) => {
      if (!change.isComponent) {
        return
      }

      // If it changes from something to undefined, it means it was removed.
      if (change.to === undefined && change.from !== undefined) {
        state.push(MapOperations.remove)
        state.push(numId)

        return
      }

      // If it changes from undefined to something, it means it was added.
      if (change.from === undefined && change.to !== undefined) {
        state.push(MapOperations.add)
        state.push(change.meta.key)
        state.push(numId)
        state.push(change.to.getCompleteState())
        return
      }

      // If it changes from something to something, it means it was updated.
      if (change.from !== change.to) {
        state.push(MapOperations.replace)
        state.push(numId)
        state.push(change.to.getCompleteState())
        return
      }

      // Otherwise, it was replaced.
      const recentChanges = change.to.getRecentChanges()

      if (recentChanges.length === 0) {
        return
      }

      state.push(MapOperations.update)
      state.push(numId)
      state.push(recentChanges)
    })

    return state
  }
}
