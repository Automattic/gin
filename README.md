# GIN

Have some api calls and/or state management to do? Gin is here to make your life easier.

> Please consume responsibly ;)

# Table of Contents

- ### [Getting Started](#getting_started)
  - [Usage](#usage)
  - [Learning](#learning)
    - [Cargo](#cargo)
      - [Cargo vs. State](#cargo_vs_state)
      - [Other Notes](#cargo_notes)
    - [Deeds](#deeds)
    - [Subscription](#subscription)
  - [Understanding the Flow](#flow)
    - [Diagrams](#diagrams)
  - [Folder Layout](#folder_layout)
  - [Testing](#testing)
  - [Tips](#tips)
- ### [API](#api)
  - [`<Store cargo={cargo: object} deeds={deeds: array}>`](#store_api)
  - [`useStore(selector) => ({cargo: {}, deeds: {}})`](#use_store)
  - [`useNamedStore(name, selector) => ({cargo: {}, deeds: {}})`](#use_named_store)
  - [`withStore(selector)(Component)`](#with_store)
  - [`withNamedStore(name, selector)(Component)`](#with_named_store)
  - [`deed.action`](#deed_action)
  - [`deed.request`](#deed_request)
  - [`deed.flow`](#deed_flow)
  - [`combineDeeds(deed), combineDeeds(deed[] | deed | deed{})`](#combine_deeds)
- ### [Test Utils](#test_utils)
  - [Approach](#test_approach)
  - [`mock`](#mock)
  - [`stub`](#stub)
  - [Stub Setup](#stub_setup)
- ### [FAQ's](#faq)

---

<a name="getting_started"></a>

# Getting Started

<a name="usage"></a>

## Basic Usage

Using Gin consists of these elements:

- Store Component
- [Cargo](#cargo)
- [Deeds](#deeds)
- [Subscribers](#subscription) using `useStore` or `withStore`

For example:

```tsx
// Parent Component
import Store, { deed } from './pathTo/store';
const initialCargo = {
  count: 0,
};
const deeds = [action.deed.called('increment').thatDoes((extras, count) => ({ count: count++ }))];

export const Parent = () => (
  <Store cargo={initialCargo} deeds={deeds}>
    <Child />
  </Store>
);
```

in the child component:

```tsx
// Child Component
import { useStore } from './pathTo/store';

export const Child = () => {
  const { deeds, cargo } = useStore();
  return (
    <div>
      <span>Current count = {cargo.count}</span>
      <button onClick={() => deeds.increment(cargo.count)}>Increment</button>
    </div>
  );
};
```

Clicking on the button in the child component would update `cargo.count` and your child would display the incremented value automagically.

---

<a name="learning"></a>

## Learning

Here's what you should take a second to learn about before we start:

### Cargo

Cargo is the data that a Store holds and exposes for subscribers. **Cargo is updated by `deeds`**. When a `deed` has updated cargo, the newly calculated cargo will be emitted to subscribers. **This is known as a shipment**.

<a name="cargo_vs_state"></a>

#### Cargo vs State

Cargo is similar what other libraries call `state`. But since every implementation of that `state` is different, we're going to avoid that name. Especially since `cargo` can live alongside React's `this.state`, it's just confusing to call both of them state.

In React, Class components have _local_ state, which is an instance variable that you access in your class with `this.state`,
and to set the state, `this.setState(newState)`. This function does more than just set the variable, it also tells react to maybe update the UI. Functional components however, don't have `this.state`, they get their data through `props`. Props are values that are passed to a direct descendant, to a React Component, accessible by that component for use, but not directly updatable by the component.

Cargo is related to both of those: it's an object that holds data you want to be able to access. Unlike `this.state` or `props`:

- You have to subscribe (using `useStore` or `withStore`) to have access
- It's scoped from the `Store` to _any_ descendant component, no matter how deep or how many other `Store`s are also descendant.
- You can only change it through `deeds`

Cargo can be used in components that also use `this.state`, and cargo can be passed into a component as `props` by using `withStore`.

<a name="cargo_notes"></a>

#### Notes

Deeds are the majority of the magic, but cargo is just as important. The Store keeps track of a cargo that you define, and that you then update through deeds. This cargo is pushed to subscribers when it updates.

Cargo should be treated as _Immutable_, that is, don't modify it, copy it.

> The value that you return from `.thenDoes` or `.thatDoes` will me merged into the existing cargo

For example:

```tsx
// GOOD
.thatDoes(function(extras, count) {
    return {
        count: count++
    }
})
---
// BAD
.thatDoes(function(extras, count) {
    // The current cargo is passed as an extra
    const cargo = extras.cargo
    cargo.count = count++
})
```

If you are nesting objects in your cargo, be sure to merge the nested objects to avoid overwriting the existing reference without bringing in the nested values:

```tsx
// GOOD
.thatDoes(function(extras, count) {
    const cargo = extras.cargo

    return {
        count: {
            ...cargo.count, // Merge the nested object
            current: cargo.count.current++
        }
    }
})
---
// BAD
.thatDoes(function(extras, count) {
    const cargo = extras.cargo

    return {
        count: { // Any elements other than 'current' in cargo.count will be undefined in the new cargo
            current: cargo.count.current++
        }
    }
})
```

<a name="subscription"></a>

<a name="deeds"></a>

### Deeds

What is a Deed?
Conceptually it is a function that you define and pass into the Store, where it is magically bound with extra arguments and functionality, then made available to subscribers bundled with all the magic. This will make more sense with examples!

#### Deed Types

Currently, there are three types of deeds: `deed.action`, `deed.request`, and `deed.flow`.

#### Action Deed - `deed.action`

```tsx
const actionDeed = deed.action.called('increment').thatDoes(function(extras, count) {
  return {
    count: count++,
  };
});
```

The core method of an action deed is the `thatDoes` function. Here we pass in a function that will later be called with some arguments (or none), as well as the `extra` argument that is added by the store.
The value returned by `thatDoes` is merged into your cargo object.

#### Request Deed - `deed.request`

```tsx
const requestDeed = deed.request
  .called('getData')
  .hits('/route/with/data')
  .withVerb('get')
  .afterwards(async function(extras, res) {
    const data = await res.json();
  });
```

Request Deeds make it simple to define an api call and do something with the response. Take a look at the api for the full list of methods available.

#### Flow Deed - `deed.flow`

```tsx
const flowDeed = deed.request
  .called('flow')
  .thatStartsWith(actionDeed)
  .whichAdvancesOn('shipment')
  .andThenCalls(requestDeed)
  .withOriginalArgs();
```

Flow deeds allow you to call multiple deeds in a single flow, with control over when the next set of deeds should be called, and where they should get their arguments from.

<a name="cargo"></a>

### Subscription

In order to get access to the `deeds` or `cargo` you've just learned about, you need to subscribe to the store. Thankfully, doing so is very easy!

**Any component that uses `useStore` or `withStore` is subscribed to the nearest ancestor `Store`**.

We prepend the file extension for subscribed components with `.sub.` to easily tell which components are subscribed and which aren't. Example: `form.sub.tsx`. Likewise, we prepend the file extension for stores with `.store.`. Example: `form.store.tsx`. If a component is both subscribed to a store, and a store itself: `form.store.sub.tsx`.

As a general rule, `useStore` is used for functional components, and `withStore` for class components.

Also not that a component can be a child of a `Store` without being subscribed to it. It won't event know that any `Store` exists, as long as there is none of the above subscription methods.

<a name="advanced_subscriptions"></a>

#### Advanced Subscriptions

In the case where you want to subscribe to a store **that isn't the nearest ancestor `Store`**, you can use `useNamedStore` or `withNamedStore`. All behavior is the same other than where you've subscribed.

To do this, pass a unique name to your `Store`, like `<Store name="user-store">`, then in your component: `useNamedStore('user-store')`, and now you've subscribed to `user-store`, regardless of how far above the component the `Store` is, and how many `Stores` are in between here and `user-store`.

> You should not, and most likely cannot, subscribe to a _Child_ or _Sibling_ `Store`. This introduces a host of unsupported behavior and stale data/rehydration management that is not currently included.

---

<a name="flow"></a>

## Understanding the flow

Let's use the following example (same as above):

```tsx
// Parent Component
import Store from '@automattic/react-gin';
import { deed } from '@automattic/gin';
const initialCargo = {
  count: 0,
};
const deeds = [action.deed.called('increment').thatDoes((extras, count) => ({ count: count++ }))];

export const Parent = () => (
  <Store cargo={initialCargo} deeds={deeds}>
    <Child />
  </Store>
);
```

in the child component:

```tsx
// Child Component
import { useStore } from '@automattic/react-gin';

export const Child = () => {
  const { deeds, cargo } = useStore();
  return (
    <div>
      <span>Current count = {cargo.count}</span>
      <button onClick={() => deeds.increment(cargo.count)}>Increment</button>
    </div>
  );
};
```

Here's what's going on:

1.  `initialCargo` and the `deeds` array are registered with Store, wrapping them and making them accessible to subscribers
2.  Child component subscribes to the Store with `useStore`, getting access to the cargo and deeds registered in Step 1

\*\* The button is clicked

3.  onClick calls `() => deeds.increment(cargo.count)`, the registered deed

    This maps to the function passed to `.thatDoes`:

    ```tsx
    count => ({ count: count++ });
    ```

4.  The `.thatDoes` of `deed.increment` is executed, the result `{count: 1}` is passed into the Store's update mechanism
5.  After the batch timer elapses, the update is merged into `initialCargo`
6.  The new cargo: `{count: 1}` is pushed to subscribers (the Child component)
7.  The new cargo is different that the current cargo, so it triggers a rerender in Child
8.  Child shows the new cargo: "Current count = 1"
    <a name="diagrams"></a>

### Diagrams

This may help you visualize the relationship between `<Store>` and `useStore` or `withStore`.

- **`useStore`**: Use with functional components, recommended for most use cases.
  > _Cannot be used with class components_

```
cargo   Deeds
|___     ___|
    |   |
    Store
      |
---Component---
|  useStore   |
|  ___|___    |  Exposed within the component
|  |      |   |
|cargo   deeds|
---------------
```

- **`withStore`**: Use with functional components, or class components
  > When possible, use `useStore`, it is more performant and doesn't pollute the virtual-dom

```
cargo   Deeds
|___     ___|
    |   |
    Store
      |
   withStore
   ___|___    Passed as props to the component
   |      |
cargo   deeds
|___________|
      |
---Component---
|             |
---------------
```

- **`useNamedStore`**: Use with functional components, useful if you need to get cargo from another Store that's not the closest ancestor Store.
  > _Cannot be used with class components_

```
        name  cargo   Deeds
         |    |___     ___|
         |        |   |
         |_________Store
                    |
cargo   Deeds       |
|___     ___|       |
    |   |           |
    Store   ________|
      x   __|          Closest store is bypassed,
         |             Named store is used instead
---Component---
|useNamedStore|
|  ___|___    |  Exposed within the component
|  |      |   |
|cargo   deeds|
---------------
```

- **`withNamedStore`**: Use with functional components, or class components
  > When possible, use `useNamedStore`, it is more performant and doesn't pollute the virtual-dom

```
        name  cargo   Deeds
         |    |___     ___|
         |        |   |
         |_________Store
                    |
cargo   Deeds       |
|___     ___|       |
    |   |           |
    Store   ________|
      x  ___|           Closest store is bypassed,
        |               Named store is used instead
withNamedStore
   ___|___    Passed as props to the component
   |      |
cargo   deeds
|___________|
      |
---Component---
|             |
---------------
```

---

<a name="folder_layout"></a>

## Folder Layout

It is recommended to use the following patterns when structuring your project:

#### Basic

```
feature-name/
  index.ts -> export {default} from './feature-name.store'
  feature-name.store.tsx
  sub-feature-name.sub.tsx
  store-logic.ts
```

Example

```
form/
  index.ts -> export {default} from './form.store'
  form.store.tsx
  form-page.sub.tsx
  submit-button.sub.tsx
  store-logic.ts
  styles.scss
```

#### Many deeds and/or large cargo

```
feature-name/
  index.ts -> export {default} from './feature-name.store'
  feature-name.store.tsx
  sub-feature-name.sub.tsx
  styles.scss
  store-logic/
    index.ts -> export {default as cargo} from './cargo'
                export {default as deeds} from './deeds'
    deeds.ts
    cargo.ts
```

Example

```
form/
  index.ts -> export {default} from './feature-name.store'
  form.store.tsx
  form-page.sub.tsx
  submit-button.sub.tsx
  styles.scss
  store-logic/
    index.ts -> export {default as cargo} from './cargo'
                export {default as deeds} from './deeds'
    deeds.ts
    cargo.ts
```

### File extensions:

Using specific notation allows us to easily see from a glance which kind of file and logic appears in a specifc file:

- `Store` Files should include `.store` in the filename
  - `file.store.jsx`
- Subscription Files should include `.sub` in the filename
  - `file.sub.jsx`
- If both `Store` and subscriber, include both `.sub` and `.store` in the filename
  - `file.store.sub.jsx`
- Any other react component has no specific treatment, just use `.jsx` like normal

### Store Logic

In simple cases, both `cargo` and `deeds` should live in a file named `store-logic`, which should define and export both items.

In cases where there are many deeds, and/or your cargo is large or very nested, use a folder named `store-logic` with a `cargo` and `deeds` file that export their respective items, along with an `index` that combines the two and re-exports them.

### Index files

`index` files may seem like extra boilerplate, but they encourage consistency and stability within a project.
For instance, take this line, that appears in every `Store` file:

```tsx
import { cargo, deeds } from './store-logic';
```

`Store` doesn't know if `store-logic` is a file or folder, nor should it have to. It may start as file when there is relatively low complexity, then at a later date change to a folder that includes seperate `cargo` and `deeds` files. Using an `index` file in the `store-logic` folder means that we don't have to update the reference in our `Store` file.

Assuming `deeds` and `cargo` files `export default` their contents, our `index` file should look like this:

```tsx
export { default as cargo } from './cargo';
export { default as deeds } from './deeds';
```

And now the `Store` file is none the wiser, everything just works.

The same concept should apply to the feature folder `index`'s as well:

```tsx
export { default } from './form.store';
```

Doing this means that from the outside, I just `import Form from '/pathTo/Form'`, and I now have the freedom to make changes to files within the folder without worrying about breaking the reference (in most cases).

---

<a name="testing"></a>

## Testing

When you test your deeds or your `.sub` components, you'll want to use `gin`'s [test utils](#test_utils) to make your life easier.

> Take a look in `examples/form-example` for real tests showcasing different flows

Some other notes about testing:

- Currently enzyme's `shallow` doesn't play nicely with all hooks. If you use `mockStores` with `stub.stores`, you will be able to use `shallow` in most cases. But if you run into issues, you may need to switch to `mount`.
- Your testing environment may or may not have a `window` shim, and that may or may not have `window.fetch`. Because `gin` relies on this, you may need to mock out `window.fetch` in your testing environment.
- `deeds` are async, so make sure you properly `await` a deed invocation, otherwise you may see race conditions or bugs
- **When integration testing or testing a flow that involves a new `cargo` shipment, do the following:**

```tsx
beforeAll(() => {
  window.fetch = () => null; // shim window for our test environment
});

beforeEach(() => {
  jest.useFakeTimers();
});
```

- **Then, when you call a deed and expect a new cargo shipment:**

```tsx
await button.simulate('click'); // calls a deed, so we await
jest.runAllTimers(); // flush the batch
wrapper.update(); // enzyme doesn't always see updates with hooks, this ensures it does
```

Make sure that you `await` any deed calls, as they are async

---

<a name="tips"></a>

## Tips

#### Selectors

Use selectors: all of the subscription functions give you the option to pass in a selector function to pick which parts of the full cargo that you want to subscribe to, and you should do so unless you are using everything in cargo.

Why? If the cargo you define in your selector does not change, your component won't get told to rerender. That's a nice performance win.

#### Debug Mode

Use the debug prop for Store to show helpful logs in the console. When your deeds are invoked and through different points in the update cycle, you'll see colorful logs that will help you troubleshoot.

#### Skip Shipment

If your deed's `thatDoes` or `thenDoes` doesn't need to update cargo, call the extra `skipShipment()` to skip the update process. Useful for side-effects, or as a performance optimization.

---

<a name="api"></a>

# API

<a name="store_api"></a>

## `<Store cargo={cargo: object} deeds={deeds: array}>`

Store component that publishes cargo updates, registers deeds, provides context

> Store files should include `.store` in the filename

##### Additional Props:

`name: string | (generatedID: string) => string` - define a named store, can be subscribed to directly with `useNamedStore` or `withNamedStore`. When a function is used, the unique generated ID is passed as the first argument

`debug: boolean` - toggle debug mode, which gives you colorful console messages to help you understand what's happening

`customFetch: function` - If you need to control the method actually making the API request, you can pass in a custom function to do it yourself.

`batchTime: number(ms)` - Control the length of time that the store will allow for multiple cargo shipments to be batched into a single shipment

`sync: object` - Pass an object whose values should be synchronized with the store's cargo. When a value changes, the new value is put into the store's update queue

##### Static Properties

`Store.defaultFetchResponse`: Change how the Store automatically handles and API response. If you want custom redirection or to change the default method, you can change this to an **`async`** function of your choosing

`Store.defaultFetchOptions`: Include Fetch options into calls by default. Great for setting up tokens or cors for all your calls

`Store.baseUrl`: Set the base URL that API paths will be appended to

---

<a name="use_store"></a>

## `useStore(selector) => ({cargo: {}, deeds: {}})`

_Can only be used with functional components._
Subscribes to the closest ancestor Store.

selector: (cargo) => ({slice: cargo.slice}) - Only listens to the selected portion of cargo

> Subscribed component files should include `.sub` in the filename

---

<a name="use_named_store"></a>

## `useNamedStore(name, selector) => ({cargo: {}, deeds: {}})`

_Can only be used with functional components._
Subscribes to the named ancestor Store(s).

> Can only subscribe to ancestor Stores, not sibling Stores

name: string | string[] - The name of the store(s) you want to subscribe to

> Note that the cargo and deeds from each store will be merged in the order you define

selector: (cargo) => ({slice: cargo.slice}) - Only listens to the selected portion of cargo

> Subscribed component files should include `.sub` in the filename

---

<a name="with_store"></a>

## `withStore(selector)(Component) => <Component cargo={cargo: object} deeds={deeds: array} />`

_Recommended for class components._
Subscribes to the closest ancestor Store.

selector: (cargo) => ({slice: cargo.slice}) - Only listens to the selected portion of cargo

> Subscribed component files should include `.sub` in the filename

---

<a name="with_named_store"></a>

## `withNamedStore(name, selector)(Component) => <Component cargo={cargo: object} deeds={deeds: array} />`

_Recommended for class components._
Subscribes to the named ancestor Store(s).

> Can only subscribe to ancestor Stores, not sibling Stores

name: string | string[] - The name of the store(s) you want to subscribe to

> Note that the cargo and deeds from each store will be merged in the order you define

selector: (cargo) => ({slice: cargo.slice}) - Only listens to the selected portion of cargo

> Subscribed component files should include `.sub` in the filename

---

<a name="deed_action"></a>

## `deed.action`

### .called(name: string)

The name you define here is the name of the deed, what you will be invoking later

### .thatDoes(function(actionExtras, ...args) => any)

The action you want to take when the deed is called.

Arguments you pass to the deed are passed into your function.

> The value returned from the function you pass is merged into cargo, to be used in the next shipment

```
actionExtras = {
    cargo: {}, // the cargo object of your store
    deeds: {}, // the deeds you have registered
    props: {}, // any other props passed to Store
    skipShipment: function // call this if you have no cargo to update
}
```

---

<a name="deed_request"></a>

## `deed.request`

Makes an API call using the methods below. **The Store currently only handles JSON responses from your API call,** and will automatically pass the response body to `afterwards` and/or `thenDoes`.

### `.called(name: string)`

The name you define here is the name of the deed, what you will be invoking later

### `.hits(path: string | function(fetchExtras, ...args))`

The url (relative or absolute) that you want to make the api request to, or a function that returns that url

```
fetchExtras = {
    cargo: {}, // the cargo object of your store
    props: {}, // any other props passed to Store
}
```

### `.withVerb(verb: string)`

The HTTP Verb that you want the request to have

### `.withHeaders(headers: {})`

The Headers you want the request to have

### `.withBody(function(fetchExtras, ...args) => any)`

Pass a function that returns what you want the body of the request to be.
That function is invoked when the deed is called: `deed.deedName(variable)` passes `variable` into the function

```
fetchExtras = {
    cargo: {}, // the cargo object of your store
    props: {}, // any other props passed to Store
}
```

### `.withJSON(function(fetchExtras, ...args) => object)`

Pass a function that returns an object of what you want the body of the request to be.
That function is invoked when the deed is called: `deed.deedName(variable)` passes `variable` into the function

**The returned object will automatically be called with `JSON.stringify`.**

Using this method will automatically set header `content-type` to `application/json; charset=utf-8`, but can be overriden with `withHeaders`.

```
fetchExtras = {
    cargo: {}, // the cargo object of your store
    props: {}, // any other props passed to Store
}
```

### `.withQueryParams(function(fetchExtras, ...args) => {})`

Pass a function that returns the key value pairs you want to be converted to a queryString and appended to the `path` from `.hits`

That function is invoked when the deed is called: `deed.deedName(variable)` passes `variable` into the function

```
fetchExtras = {
    cargo: {}, // the cargo object of your store
    props: {}, // any other props passed to Store
}
```

### `.withConfig(function(fetchExtras, ...args) => {})`

Pass a function that configures all the options that fetch can handle.

Useful for configuring things like `cors` or if you want total control of the config

That function is invoked when the deed is called: `deed.deedName(variable)` passes `variable` into the function

```
fetchExtras = {
    cargo: {}, // the cargo object of your store
    props: {}, // any other props passed to Store
}
```

### `.afterwards(function(resExtras, res) => {})`

Pass a function that is executed after a request is successful, _this is called before `.thenDoes` if present_

> The value returned from the function you pass is **NOT** merged into cargo, it is passed to `thenDoes`

```
resExtras = {
    deeds: {}, // the deeds you have registered
    props: {}, // any other props passed to Store
    cargo: {}, // the cargo object of your store
}
```

### `.catchError(function(resExtras, e) => void)`

Pass a function to handle when a request fails. You can use extras.deeds to call a deed to set a loader or error message or something

```
resExtras = {
    deeds: {}, // the deeds you have registered
    props: {}, // any other props passed to Store
    cargo: {}, // the cargo object of your store
}
```

### `.thenDoes(function(actionExtras, res) => any)`

The action you want to take when the request has returned, _this is called after `.afterwards` if present_

> The value returned from the function you pass is merged into cargo

```
actionExtras = {
    cargo: {}, // the cargo object of your store
    deeds: {}, // the deeds you have registered
    props: {}, // any other props passed to Store
    skipShipment: function // call this if you have no cargo to update
}
```

---

<a name="deed_flow"></a>

## `deed.flow`

### `.called(name: string)`

The name you define here is the name of the deed, what you will be invoking later

### `.thatStartsWith(deed | deed[])`

The first deed or array of deeds that will be called with the arguments passed during invocation of the deed. By default, the flow will advance on `'done'`.

> Calling `.withOriginalArgs()` does nothing here, since the first deeds will always get arguments passed from invocation

### `.andThenCalls(deed | deed[])`

Queues the next deed or array of deeds to be called once the previous deeds advance.

### `.whichAdvancesOn("done" | "shipment")`

Control when the previous deed or deed array should advance to the next set.

- `'done'` advances when:

  - A `RequestDeed` has finished executing `thenDoes` if applicable, or after `.afterwards` otherwise
  - An `ActionDeed` has finished executing `thatDoes`
  - A `FlowDeed` has finished its flow

- `'shipment'` advances when:
  - After a `RequestDeed` calls `thenDoes` and its cargo is shipped, or after `.afterwards` otherwise
  - After an `ActionDeed` calls `thatDoes` and its cargo is shipped
  - A `FlowDeed` has finished its flow

**Here's a diagram showing when each trigger is called:**

```
  ActionDeed                RequestDeed             FlowDeed
      |                          |                      |
   thatDoes()               makes API call      Calls all items in Flow
      |  - - - "done"            |                      | - - - "done"
Store Ships cargo            afterwards()               | - - - "shipment"
      | - - - "shipment          |
                              thenDoes())
                                 | - - - "done"
                            Store Ships cargo
                                 | - - - "shipment"
```

### `.withOriginalArgs()`

Causes this stage of the flow to use the arguments passed in the flow's invocation

### `.whichMapsTo(function(previousResult) => nextArgs)`

Transforms the result of the stage before passing it along

> May be useful when the stage calls an array of deeds, to map the array of results into a single value

---

<a name="combine_deeds"></a>

## `combineDeeds(deed[] | deed | deed{})`

Utility function to combine deeds from multiple sources

```tsx
const deeds = combineDeeds(arrayOfDeeds, importedModuleWithDeeds, request.deed, [action.deed], etc...)
```

---

<a name="test_utils"></a>

# Test Utils

You should probably write tests for your application, especially when it's as easy as using these tools.

> Take a look in `examples/form-example` for real tests showcasing different flows

<a name="test_approach"></a>

## Approach

You are free to write whatever type of test you want, but here are some recommended ways to use the provided test utilities.

### Test your deeds in isolation with `mock`

`mock` allows you to unit test each call of a deed, keeping your tests pure and simple.

**Usage:**

Given this deed

```ts
const someActionDeed = deed.action
 .called('action')
 .thatDoes((extras, x) => ({ data: x })
```

Use the following in your test

```ts
mock
  .thisCall('thatDoes') // the call that you are testing
  .fromThisDeed(someActionDeed)
  .withArgs('foo')
  .thenAssert(result => expect(result.data).toEqual('foo'));
```

---

### Test your subscribers with `stub`

`stub` provides methods to replace either or both deeds or stores with the logic of your choosing.

- Use `stub.stores` to control exactly which deeds and cargo are passed to your subscribers, without worrying about batching, store names, or heirarchy
- Use `stub.thisDeed` to replace a deed's invocation with a function that you provide, giving maximum control over your tests

**Usage:**

Given this sample

```tsx
const SomeComponent = () => {
  const { cargo, deeds } = useNamedStore(['store1', 'store2']);

  useEffect(() => {
    deeds.onLoad(); // sample deed call
  }, []);

  return (
    <span>
      {cargo.label}: {cargo.value}
    </span>
  );
};
```

Your tests might look like this

```tsx
// inside a test block, after calling gin.mockStores()

// setup stubbed deed
const testFn = jest.fn();
const stubOnLoad = stub.thisDeed('onLoad').withThis(testFn);

// setup stubbed stores
stub.stores
  .withCargo({
    label: 'Count',
    value: 2,
  })
  .withDeeds([stubOnLoad]);

// using enzyme's mount method
const wrapper = mount(<SomeComponent />);

// useEffect calls on mount
expect(testFn).toHaveBeenCalled();
expect(wrapper.text()).toEqual('Count: 2');
```

### TL;DR

When you're testing your deed logic, use [`mock`](#mock), when you're testing your subscribers, use [`stub`](#stub).

<a name="mock"></a>

## `mock`

You wrote some awesome deeds and want to make sure they work forever, just use `mock` to easily do that. **The API is the same for any type of deed.**

**Usage**

Given this deed

```ts
const someActionDeed = deed.action
 .called('action')
 .thatDoes((xt, arg1) => ({
   data: {
     ...xt.cargo.data,
     ...arg1
   },
   })
```

Use the following in your test

```ts
mock
 .thisCall('thatDoes')
 .fromThisDeed(someActionDeed)
 .withExtras({
   cargo: {
     data: {
       foo: 'bar
     },
   },
 })
 .withArgs({ test: true })
 .thenAssert(result => expect(result.data).toEqual({ foo: 'bar', test: true }))
```

<a name="mock_api"></a>

## `mock` API

### `.thisCall(method: string)`

Pass in the deed method you want to mock

> Does not support methods like `withVerb`, `withHeaders`, or `called` because they are given constants

### `.fromThisDeed(deed: ActionDeed | RequestDeed)`

Pass in the deed you want to mock, can be either type.

### `.withExtras(extras: ActionExtras | RequestExtras | FetchExtras)`

> Optional

Pass the extras argument your method expects.

### `.withArgs(...args)`

> Optional

Pass in additional arguments that your method expects.

### `.thenAssert(assertFunction(result) : void)`

Calls your method with the mock arguments you've defined, and passes the result to the `assertFunction` you define here. Typically you'd assert that the result of the call is what you'd expect.

### `.withArgs(...args)`

> Optional

Pass in additional arguments that your method expects.

### `.atThisStage(stage: number)`

Only for FlowDeeds, defines which stage the mock should be testing against, zero indexed.

---

<a name="stub"></a>

## `stub`

If you need more control for your component test, use `stub` to quickly
replace a deed or your stores with a stubbed version.

<a name="stub_deeds"></a>

## Examples

**Stubbed deeds:**

```tsx
// Component.sub.tsx
const Child = () => {
  const { deeds } = useStore();
  return <button onClick={deeds.requestDeed} />;
};
```

```ts
// store-logic.ts
const requestDeed = deed.request
  .called('requestDeed')
  .hits('/test')
  .withVerb('GET')
  .withQueryParams((extras, e) => ({ [e]: true }));
```

```tsx
// tests.tsx
const testFn = jest.fn();
const testDeed = stub.thisDeed('requestDeed').withThis(testFn);
const wrapper = mount(
  <Store cargo={{}} deeds={[testDeed]}>
    <Child />
  </Store>,
);

wrapper.find('button').simulate('click');
expect(testFn).toHaveBeenCalled();
```

In that example we passed a string to `thisDeed`, but we can also pass the deed itself and have the same functionality: `thisDeed(requestDeed)`.

---

**Stubbed stores:**

```tsx
// Component.sub.tsx
const Child = () => {
  const { deeds, cargo } = useStore();
  return <button id={cargo.id} onClick={deeds.requestDeed} />;
};
```

```ts
// store-logic.ts
const requestDeed = deed.request
  .called('requestDeed')
  .hits('/test')
  .withVerb('GET')
  .withQueryParams((extras, e) => ({ [e]: true }));
```

```tsx
// tests.tsx
const store = stub.stores
  .withCargo({ id: 'id' })
  .withDeeds([requestDeed])
  .andExpose();

const wrapper = shallow(<Child />);
wrapper.find('button').simulate('click'); // calls requestDeed

expect(store.calls.requestDeed.count).toEqual(1);
expect(wrapper.prop('id')).toEqual('id');
```

In that example we passed a real deed to `withDeeds`, but we can also pass just the deed name, or even a stubbed deed - which
will retain the stubbed implementation.

---

<a name="stub_api"></a>

## `stub` API

<a name="stub_thisDeed"></a>

#### for deeds

### `.thisDeed(deedOrName: string | Deed)`

Pass in the deed you want to mock, can be either type, or just pass the name of the deed.

<a name="stub_withThis"></a>

### `.withThis(testFunction())`

Define a function that you want to be invoked when the deed is called. No arguments are passed.

---

#### for stores

<a name="stub_stores"></a>

### `.stores`

Exposes the methods below to provide the stubs for your store. **Replaces and combines all Stores, no matter how many stores your subscriber is subbed to.**

> Checkout [stub setup](#stub_setup) before using

<a name="stub_stores_withCargo"></a>

### `.withCargo(cargo: {})`

Passes the provided cargo down to subscribers

**Usage:**

```ts
stub.stores
  .withCargo({foo: 'bar'});
```

<a name="stub_stores_withDeeds"></a>

### `.withDeeds(deeds: (string | Deed)[], override?: {})`

`deeds` must be an array, but can contain string names of deeds and/or actual deed definitions and/or stub deeds

> If a stub deed is used, the implementation defined with `withThis` will be used when the deed is invoked. Otherwise
> the default implementation for the passed-down deeds is a noop

`override` can be used to change the default implementation of the deeds you pass down

**Usage:**

```ts
stub.stores
  .withDeeds(['deedName', 'otherDeed'],
  {
    deedName: () => `this is called instead`,
  }
);
// otherDeed will still have the default noop implementation
```

<a name="stub_stores_andExpose"></a>

### `.andExpose() => TestStore`

Used to gain access to the TestStore

**Usage:**

```ts
const store = stub.stores
  .withCargo({foo: 'bar'})
  .andExpose();
// otherDeed will still have the default noop implementaiton
```

#### `TestStore.calls`

The calls property exposes information about the calls to the deeds that you defined in `stub.stores.withDeeds`

**Usage**

```ts
// get the call count for a deed called "deedName"
store.calls.deedName.count

// get the arguments from a deed called "deedName" on the second call
store.calls.deedName.0.args
```


<a name="reset"></a>

### `.reset()`

Clears the cargo, deeds, and calls data from the TestStore

> Useful to cleanup between tests

**Example Usage**

```ts
// recommended usage
afterEach(stub.stores.reset);

// per test
it('some test', () => {
  // setup
  const store = stub.stores.withDeeds(['deedName']);

  // test assertions
  stub.stores.reset();
  // stub.stores can be setup again
});
```

<a name="resetCalls"></a>

### `.resetCalls()`

Clears calls data from `stub.stores`

> Useful if the same deeds are used across tests.

**Example Usage**

```ts
// recommended usage if deeds are shared between tests
afterEach(stub.stores.resetCalls);

// per test
it('some test', () => {
  // setup
  const store = stub.stores.withDeeds(['deedName']);
  // test assertions
  stub.stores.resetCalls();
  // store.calls is reset
});
```


---

<a name="stub_setup"></a>

## Stub Setup

In order to use `stub.stores` you must at minimum call `mockStores()` _before_ use.
Below are additional calls to help control the TestStore

<a name="mockStores"></a>

### `mockStores()`

Prepares `gin` to allow use of `stub.stores`

**Example Usage**

```ts
import { mockStores } from '@automattic/gin';

// recommended usage
beforeAll(mockStores);

// per test
it('some test', () => {
  mockStores();
  // test assertions
});
```

<a name="unmockStores"></a>

### `unmockStores()`

Reverts `gin` for normal use

**Example Usage**

```ts
import { mockStores, unmockStores } from '@automattic/gin';

// recommended usage
beforeAll(mockStores);
afterAll(unmockStores);

// per test
it('some test', () => {
  mockStores();
  // test assertions
  unmockStores();
});
```

---

<a name="faq"></a>

# FAQ's

### What is the difference between `thatDoes` and `thenDoes`?

They are similar: the returned value from both is used to queue a new cargo shipment

**`deed.action.thatDoes`** is called immediately when you call your action deed, and whatever aguments you pass to that deed are passed into `thatDoes`.

**`deed.request.thenDoes`** is called after your api request resolves successfully with the data from the api as the first argument.

> If you use `afterwards`, that is called with the api data first, with the value returned from `afterwards` now being passed to `thenDoes`. - apiResponse -> afterwards -> thenDoes

---
