So far this doc is for internal use. Once this PR is ready to be merged in it should be updated to have more info. But, 
since some things are likely to change this is 

# Outline

The main idea with this refactor is to separate the form logic from the rendering logic.
For this reason forms are split into two components. The first one is `PorterFormContextProvider`,
which provides a context that the second component `PorterForm` subscribes to using a custom hook.
This relationship should be kept in mind when adding new functionality to this system: logic and rendering must be 
separated between these components.

# Custom Hook

In general, a form field is determined by three factors - the current variables of the form, the props that are assigned to it
in the form YAML and its internal state. To implement this idea, once rendered, a form field subscribes to the context using the `useFormField` hook. 
To see how this hook works, check out this example:
```typescript
const { state, variables, setVars, setState, setValidation } = useFormField<FieldState>(
    props.id,
    {
      initState: {},
      initValidation: {
        validated: !props.required,
      },
      initVars: {},
    }
  );
```
The hook takes in two arguments - an id (these are automatically assigned by the context and passed through a prop) and
a dictionary that describes the intial values for its state, validation and any variables that need to be set for the form.
Note that these are only set once per form lifecycle (the field component can unmount and mount as much as it wants).
The hook recieves the state of the field (according to the id), a list of all the variables in the form and three functions to 
change these values and its validation. Note that all of these functions work by taking in state update functions. So, for example,
if one wanted to add a new variable "foo" to the form with value "bar", they could do:
```typescript
setVars((vars) => {
    return {
        ...vars,
        foo: "bar"
    }
})
```
And similarly with the other two functions. Also note that state should be used in order to handle component-specific 
state data. If some kind of data needs to be shared between components, a variable can be used to do that (for example, input does this).
Finally, the `state` returned by the hook is not guaranteed exist, so a null check for that is needed in every component.

# Exporting Data

In addition to the component that renders the field, each field file can also have a function that applies a modification
to form variables once the form is submitted. For example, this can be used when a field has a unit setting and one does
not want to store the field value with the unit attached in the form state. The function takes in the variables of the form, 
the props of the field, and the fields state on submission. Here's an example used in the input field:

```typescript
export const getFinalVariablesForStringInput: GetFinalVariablesFunction = (
  vars,
  props: InputField
) => {
  if (vars[props.variable])
    return {
      [props.variable]:
        props.settings?.unit && !props.settings?.omitUnitFromValue
          ? vars[props.variable] + props.settings.unit
          : vars[props.variable],
    };
  return {
    [props.variable]: props.settings?.default,
  };
};
```