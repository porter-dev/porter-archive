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