# Adding Analytics

## Package Overview

The [analytics package](https://github.com/porter-dev/porter/tree/master/internal/analytics) is currently dependent on Segment, so to use it you need to add your segment key via an environment variables `SEGMENT_CLIENT_KEY` in the `docker/.env` file. See [this link](https://segment.com/docs/connections/find-writekey/) for information on how to retrieve your key.

This package is divided in five files:

- segment.go

  The _segment.go_ file exports a function to initialize the analytics client, and two superset of the original segment client functions Track and Identify. This functions will handle cases when the segment client is not initialized and will return an error if the client failed enqueueing a certain track/identify.

- tracks.go

  _tracks.go_ will export an interface `SegmentTrack` that all the tracks should follow, this helps when trying to standardize the analytics package. The idea behind this is to always use a constructor for the track that we're trying to use instead of having different implementations all over the app.

- track_scopes.go

  _track_scopes.go_ contains a set of "scopes" that a certain `SegmentTrack` will use. API operations can be user-scoped, project-scoped, cluster-scoped, etc. These scopes will populate certain fields in the track, like `project_id` and `cluster_id`. Most tracks will be project- or cluster-scoped, so when adding a new track, you can likely use an existing scope. If adding a scope is required, it should be straightforward to use the existing structure contained in this file.

- track_events.go

  Enum of events that can be used on tracks, those will be implemented on the tracks.go so they shouldn't appear in any other part of the application.

- identifiers.go

  Similar as the tracks.go, although this is more specialized as it should only be used on user register/login/update parts of the application.

## Adding New Analytics

### Adding New Events to Track

To add a new event to track, you should follow two steps (see example below):

1. Add the event in `track_events.go`, in the form `[Noun][Verb][Subverb]` (for example, `ClusterProvisioningSuccess`).

2. You should then add the track in `tracks.go` by adding the following methods:

```go
// [Noun][Verb][Subverb]TrackOpts
type [Noun][Verb][Subverb]TrackOpts  struct {
	// *Optional Scope

  // Additional fields
}

// [Noun][Verb][Subverb]Track
func [Noun][Verb][Subverb]Track(opts *[Noun][Verb][Subverb]TrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

  // add additional fields to the Segment properties

  // return an object which implements segmentTrack -- you can most likely use a scope helper here
}
```

So for example, to implement the track `ClusterProvisioningSuccess`, the following gets written:

1. In `track_events.go`:

```go
  ClusterProvisioningSuccess SegmentEvent = "Cluster Provisioning Success"
```

2. In `tracks.go`:

```go
// ClusterProvisioningSuccessTrackOpts are the options for creating a track when a cluster
// has successfully provisioned
type ClusterProvisioningSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType models.InfraKind
	InfraID     uint
}

// ClusterProvisioningSuccessTrack returns a new track for when a cluster
// has successfully provisioned
func ClusterProvisioningSuccessTrack(opts *ClusterProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningSuccess),
	)
}
```

### Adding New Segment [Specs](https://segment.com/docs/connections/spec/)

The current implementation only uses [Tracks](https://segment.com/docs/connections/spec/track/) and [Identifiers](https://segment.com/docs/connections/spec/identify/) specs from the segment package, in order to add a new spec you should follow this steps:

- Add the spec function that you want to use on the `internal/analytics/segment.go` file, it should always receive an interface that will get the necessary data for the segment spec function that you want to add.
- Create a new file on the same `internal/analytics` folder with the name on plural of the spec you want to add.
- In this spec file, you should declare the interface that the analyticsClient spec function will receive, and after that the correspondant structs that will refer to the different metrics you want to add. For more examples on how to implement this you can use as reference the `internal/analytics/tracks.go` file.
- Update this file with the correspondant documentation about the implementation
