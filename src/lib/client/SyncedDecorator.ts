// Decorates the value of a property to be synced with the client
export const Synced = () => {
  return function (target: any, propertyKey: string) {
    // Initialize the static property if it doesn't exist
    if (!target.constructor.hasOwnProperty("SyncedProperties")) {
      target.constructor.SyncedProperties = []
    }

    if (!target.constructor.hasOwnProperty("AllSynced")) {
      target.constructor.AllSynced = []
    }

    // Add the property key to the list of synced properties
    target.constructor.SyncedProperties.push(propertyKey)
    target.constructor.AllSynced.push(propertyKey)
  }
}

// Decorates the value of a property to be a component synced with the client
export const SyncedComponent = () => {
  return function (target: any, propertyKey: string) {
    // Initialize the static property if it doesn't exist
    if (!target.constructor.hasOwnProperty("SyncedComponents")) {
      target.constructor.SyncedComponents = []
    }

    if (!target.constructor.hasOwnProperty("AllSynced")) {
      target.constructor.AllSynced = []
    }

    // Add the property key to the list of synced components
    target.constructor.SyncedComponents.push(propertyKey)
    target.constructor.AllSynced.push(propertyKey)
  }
}

// Decorates a class to be synced with the client.
// This is needed to avoid having to call makeSynced() manually.
// Otherwise defineProperty() doesn't work as expected with derived classes.
export const WithSynced = <T extends { new (...args: any[]): {} }>(
  constructor: T
) => {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args)
      //@ts-ignore
      if (typeof this["makeSynced"] === "function") {
        //@ts-ignore
        this["makeSynced"]()
      }
    }
  }
}
