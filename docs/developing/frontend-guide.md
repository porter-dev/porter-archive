# Porter Frontend Contribution Guide

### Components

#### Functional Components and Migration

Currently, most of the frontend is written using Class Components. If you contribute to any part of the frontend, you are encouraged to rewrite any class component into a functional component. While doing so, keep a few things in mind:

#### Context

If a prop is passed down more than three levels in the component heirarchy, it should be rewritten to be contained in a context. Make sure that all the components that then consume this context are functional, since the Context API isn't very good for class components.

#### Typing and Internal Organization

To keep a functional component consistent, it should be typed using `React.FC` with a `Props` interface. Internally, the hooks used by the component should be listed near each other at the start of the function body, to avoid confusion. For example, the following is a component that obeys these rules:

```typescript
interface Props {
    ...
}

const MyComponent: React.FC<Props> = (props) => {
    const [foo, updateFoo] = useState(...);
    const [bar, updateBar] = useState(...);
    const { baz } = useContext(...);

    const qux  = ...;

    ...
}
```

### Routing model for new standard:

The idea is to keep something similar to what NextJS or Angular+2 with submodules does, if we have a route the folder structure should try to respect that path

For example:

Having the following routes

```
URL dashboard.getporter.dev/cluster-dashboard/node-list
URL dashboard.getporter.dev/cluster-dashboard/expanded-node-view
URL dashboard.getporter.dev/project-dashboard/cluster-list
URL dashboard.getporter.dev/applications?cluster_id=somename
```

We should end with the following structure

```
|-- src/
    |-- project-dashboard
 	|	|-- Routes.tsx
    |   |-- ProjectDashboard.tsx
 	|	|-- _SomeSpecificComponentNeeded.tsx
 	|	`-- cluster-list
 	|		`-- ClusterList.tsx
    |-- cluster-dashboard
 	|	|-- Routes.tsx
 	|	|-- ClusterDashboard.tsx
 	|	|-- node-list
 	|	|	`-- NodeList.tsx
 	|	`-- expanded-node-view
 	|		`-- ExpandedNodeView
    `-- applications
        |-- Route.tsx
        `-- Applications.tsx
```

All first level routes should have it's own folder as it may be considered a new module of the application, inside each module we may have specific components we don't wanna share between modules, those should be named with an underscore first to be clear that they're not pages but simple components.
In the case that the Routes.tsx on the module became too long, it can be divided into subroutes inside the subfollowing folders.

### Hooks

One of the advantages of using react 16+ is the posibility to create custom hooks, so if you feel that something could be easier or you could reduce the repetition of logic by using custom hooks we encourage you to do so!

#### Where should I place my new hooks

If the hook that you're creating may be used all over the application you can add it to the `src/shared/hooks` folder, if not, you can place them right next to the components that will be using the hooks.

#### Typing and documentation

Please note that every hook that you may create will be used by other people, so typing it and adding comments on how it works/why you create such hook is super useful and we encourage this behaviour.

### Forms

On the frontend, there are two components responsible for making forms work and are separated such that one only handles 
the form logic while the other does the rendering. The first one is `PorterFormContextProvider`,
which provides a context that the second component `PorterForm` subscribes to using a custom hook.
This relationship should be kept in mind when adding new functionality to this system: logic and rendering must be
separated between these components.

### Form State
As a whole, the frontend form stores its state in three places:
1. The variables of the form - these are shared and can be modified by any form field
2. The state specific to each form field which can only be modified by the form field itself
3. The validation information for each field which can only be modified by the form field itself

This state is exposed to each form field through the `useFormFieldHook<T>` (where `T` is the interface describing the state of the component), which every component calls with a unique id passed down
to it through props:
```typescript
interface FieldStateInterface {
    some: string;
    fields: boolean;
}

const { state, variables, setVars, setState, setValidation } = useFormField<FieldStateInterface>(
    props.id,
    {
      initState: {
          some: "foo",
          fields: false,
      },
      initValidation: {
        validated: !props.required
      },
      initVars: {},
    }
  );
```
The returned state changing functions behave in the same way as the `setState` function behaves in Class components. So,
for example, if we wanted to change the value of variable "foo" in the form, we could write:
```typescript
setVars((vars) => {
    return {
        ...vars,
        foo: "bar"
    }
})
```
To see more about how this system works, check out the implementation for some simpler form components like `Checkbox` or 
`Input`.

### Extracting Variables on Submit

If you looked at the implementations of other form fields, you may have noticed that each form field file
exports a function in the form `getFinalVariablesFor[FieldName]`. This function is neccesarry for two reasons:
1. Sometimes, when the form is submitted, some fields have not yet been rendered but still need their values included
in the final variable output (for example, if a string input has a default value).
   
2. Sometimes, a field wants to make modification to the variable/state belonging to it before the form is submitted
   (for example, a string input could append units to its value on submission).
   
So, if a field has a default/wants to modify variables on submit, this functions should be included in the file
(and in the appropriate place in the `PorterFormContextProvider`). In general, this function takes in three arguments:
the list of unmodified variables on submission, the props of the field, and the state of the field upon submission. It 
returns an object that will be applied on top of the variable list. Also note that the state passed into this function
could be `null` or `undefined` if the field has never been rendered. For more details, look at the implementation of this function for `Input`.
   
