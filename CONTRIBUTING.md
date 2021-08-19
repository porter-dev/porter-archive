# Contributing to Porter

First off, thanks for considering contributing to Porter. There are many types of contributions you can make, including bug reports and fixes, improving documentation, writing tutorials, and larger feature requests or changes. You can contribute to this repo or the [porter-charts](https://github.com/porter-dev/porter-charts) repo if you're interested in developing charts. 

Before you contribute, make sure to read these guidelines thoroughly, so that you can get your pull request reviewed and finalized as quickly as possible. 

- [Reporting Issues](#reporting-issues)
- [Development Process Overview](#development-process-overview)
  * [Good first issues and bug fixes](#good-first-issues-and-bug-fixes)
  * [Improving Documentation and Writing Tutorials](#improving-documentation-and-writing-tutorials)
  * [Features](#features)
- [Writing Code](#writing-code)
  * [Navigating the Codebase](#navigating-the-codebase)
  * [Getting started](#getting-started)
  * [Testing](#testing)
- [Making the PR](#making-the-pr)

> **Note:** we're still working on our contributing process, as we're a young project. If you'd like to suggest or discuss changes to this document or the process in general, we're very open to suggestions and would appreciate if you reach out on Discord or at [contact@getporter.dev](mailto:contact@getporter.dev)! To suggest additions to this document, feel free to raise an issue or make a PR with the changes. 

## Reporting Issues

> **IMPORTANT:** If you've found a security issue, please email us directly at [contact@getporter.dev](mailto:contact@getporter.dev) instead of raising a public issue.

Bug reports help make Porter better for everyone. To create a bug report, select the "Bug Report" template when you create a new issue. This template will provide you with a structure so we can best recreate the issue. Please search within our issues before raising a new one to make sure you're not raising a duplicate.

## Development Process Overview 

We officially build new releases every other Friday, but we merge new features and fixes to our hosted version as soon as those features are ready. If the PR can get reviewed and merged before the next release, we will add it to our public roadmap for that upcoming release (https://github.com/porter-dev/porter/projects), which gets announced to the community every other Friday.

### Good first issues and bug fixes

> **Note:** if you're a first-time contributor, we recommend that you [follow this tutorial](http://makeapullrequest.com/) to learn how to start contributing. 

If you want to start getting familiar with Porter's codebase, we do our best to tag issues with [`good-first-issue`](https://github.com/porter-dev/porter/labels/good%20first%20issue) if the issue is very limited in scope or only requires changes to a few localized files. If you'd like to be assigned an issue, feel free to reach out on Discord or over email, or you can simply comment on an issue you'd like to work on. 

### Improving Documentation and Writing Tutorials

Documentation is hosted at [docs.getporter.dev](https://docs.getporter.dev). To update existing documentation, you can suggest changes directly from the docs website. To create new documentation or write a tutorial, you can add a document in the `/docs` folder and make a PR directly. 

### Features

If you'd like to suggest a feature, we have a **#suggestions** channel on Discord that we frequently check to see which new features to work on. If you'd like to suggest and also work on the feature, we ask that you first message one of us on Discord or send an email describing the feature -- some features may not be entirely feasible. We require that all features have a detailed spec written in a PR **before** work on that feature begins. We will then review that spec in the PR discussion until the spec is clear and accomplishes the end goal of the feature request. 

## Writing Code 

Our backend is written in Golang, and our frontend is written in Typescript (using React). The root of the project is a Go repository containing `go.mod` and `go.sum`, while the `/dashboard` folder contains the React app with `package.json`. Our templates/add-ons are hosted in other repositories and are written using Helm (more info on contributing to these repositories will be added soon). 

### Navigating the Codebase

Here's an annotated directory structure to assist you in navigating the codebase. This only lists the most important folders and packages: 

```bash
.
├── cli              # CLI commands and runtime
├── cmd              # Entrypoint packages (main.go files)
│   └── app            # The primary entrypoint to running the server
├── dashboard        # contains the frontend React app
├── internal         # Internal Go packages
│   ├── forms          # contains the web form specifications for POST requests
│   ├── helm           # contains the logic for performing helm actions
│   ├── kubernetes     # contains the logic for interacting with the kubernetes api
│   ├── models         # contains the DB (and some other shared) models
│   └── repository     # implements a repository pattern for DB CRUD operations using gorm
├── scripts          # contains build scripts for releases (rarely modified)
├── server           # contains routes, API handlers, and server middleware
│   ├── api            # api handlers
│   └── router         # routes and routing middleware
└── services         # contains auxiliary stand-alone services that are run on Porter
```

### Getting started

If you've made it this far, you have all the information required to get your dev environment up and running! After forking and cloning the repo, you should [follow this guide](/docs/developing/setup.md) for the development setup. 

Happy developing!

### Testing 

All backend changes made after [release 0.2.0](https://github.com/porter-dev/porter/projects/2) will require tests. Backend testing is done using Golang's [built in testing package](https://golang.org/pkg/testing/). Before pushing changes, run `go test ./...` in the root directory and make sure that your changes did not break any tests. While we don't require 100% code coverage for tests, we expect tests to cover all functionality and common edge cases/exceptions. If you're fixing a backend bug, add a test to ensure that bug doesn't come up again. 

We do not currently have a process for frontend testing -- if building out a frontend testing process is something you'd like to work on, don't hesitate to reach out as this is something we'll introduce soon. 

## Making the PR

To ensure that your PR is merged before an upcoming release, it is easiest if you prefix the branch with the release version you'd like to be finished by (the upcoming two releases will always exist at https://github.com/porter-dev/porter/projects). If your pull request is related to an issue, please mention that issue in the branch name. So for example, if I'd like to close issue `200` and I'd like to merge the PR by release `0.3.0`, I would run `git checkout -b 0.3.0-200-pod-deletion`. 

For now, request [**@abelanger5**](https://github.com/abelanger5) to review your PR. 
