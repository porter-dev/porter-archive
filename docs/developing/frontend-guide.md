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
