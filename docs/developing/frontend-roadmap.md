# Frontend Roadmap

We know that the current state of the Porter Dashboard is not the most updated one in terms of React practices, but the idea is not to keep it that way. That's why we want to introduce a new roadmap that every contributor can help on in terms to improve the current functionality!

If you want to see the current state of the roadmap you can check out this document! [Frontend Roadmap Status](frontend-roadmap-status.md)

## Roadmap

The next image represents a raw perspective of how we want to face this migration to update and improve our dashboard in terms of technical debt! You can see a more step by step detailed guide below.

![image](https://user-images.githubusercontent.com/23369263/128541304-4e7a8d3d-08f5-4c3c-841f-91f8abfbef4c.png)

### Migrate to functional components

This step is pretty self explinatory, we want to leave behind class components and build a new era of Functional components with custom hooks and all the pretty stuff that came after React 16 version. The main idea is to have the chance to have almost all the application on functional components and start separating stuff to custom hooks when it's needed to improve the readability of components.

If you want to help on this step, you need to consider two things:

- We want to rewrite the minimal amount of logic necessary to migrate, don't spend hours trying to improve the component, just having it as functional instead of class based is enough for this step.
- The functional component should be an equivalent version of it's class component (this means, that the functionality should be the same even if the implementation may vary a little).

### Setup Jest and testing

This is one of the big ones, after migrate a component to functional components, the idea is to setup tests to be sure that the components behaviour is the one that we expect, after all, testing is one of the keys to have a more stable system. We want to use [Jest](https://jestjs.io/docs/getting-started) and the [React Testing library](https://testing-library.com/docs/react-testing-library/intro/) to get this step done, mainly because we want to implement as much as possible black box testing, this is mainly because of the next step `Clean up data flows` where we will be updating most of the internal data flows of the components, but we want to keep the functionality for the user to be the same.

#### Want to help on this step?

We are not testing experts, so there's probably a lot of things to improve the way of how we think about this, don't doubt on asking us or suggesting on our [discord channel](https://discord.gg/GJynMR3KXK)!

### Clean up datas flows

Right here is where all the magic will happen, currently the components are highly coupled and this makes really hard for implementing new features and we detect a lot of cases where the performance of the app is dropped.
This step should be composed by a couple of questions:

- Can we reduce the http calls that we're making?
- Can we reduce the amount of data that we're handling?
- Do we need a context for handling data to be more optimal and clean?
- And last, is there anything that we can atomize and share between multiple components?

With this questions in mind, is pretty obvious that the work for clean up can be really hard, but the main idea is to make the components as readable as possible, adding comments, removing useless logic or making it more accessible for new contributors!

### Migrate routes

This one is a little bit more trickier in terms of implementation, as its not aimed for just one component but instead, for a whole set of components that have deep relations between them. A clear example of this is the applications module, it's a tightly coupled set of components that are mixed with jobs and env groups, even if they don't share any logic and a really small sets of components, this is clearly not clean in any way and this step should help the project to be more organized for exploring it and to know where to add new stuff or find the component that we want to change!

You can find more about the routing system that we will implement on the [frontend guide document](frontend-guide.md)!
