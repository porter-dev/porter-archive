# How the analytics package works

The analytics package is entirely dependant over segment, to use it you should add
a config key SEGMENT_CLIENT_KEY on `docker/.env` file.
To find the segment client key check [this link](https://segment.com/docs/connections/find-writekey/).

This package is divided in four files:

- segment.go

  The _segment.go_ file exports a function to initialize the analytics client, and two superset of the original segment client functions Track and Identify. This functions will handle cases when the segment client is not initialized and will return an error if the client failed enqueueing a certain track/identify.

- tracks.go

  _tracks.go_ will export an interface `SegmentTrack` that all the tracks should follow, this helps when trying to standardize the analytics package. The idea behind this is to always use a constructor for the track that we're trying to use instead of having different implementations all over the app.

- track_events.go

  Enum of events that can be used on tracks, those will be implemented on the tracks.go so they shouldn't appear in any other part of the application.

- identifiers.go

  Similar as the tracks.go, although this is more specialized as it should only be used on user register/login/update parts of the application.

## How to add new analytics to the app

### Adding new segment spec objects

The current implementation only uses [Tracks](https://segment.com/docs/connections/spec/track/) and [Identifiers](https://segment.com/docs/connections/spec/identify/) specs from the segment package, in order to add a new spec you should follow this steps:

- Add the spec function that you want to use on the `internal/analytics/segment.go` file, it should always receive an interface that will get the necessary data for the segment spec function that you want to add.
- Create a new file on the same `internal/analytics` folder with the name on plural of the spec you want to add.
- In this spec file, you should declare the interface that the analyticsClient spec function will receive, and after that the correspondant structs that will refer to the different metrics you want to add. For more examples on how to implement this you can use as reference the `internal/analytics/tracks.go` file.
- Update this file with the correspondant documentation about the implementation

### Adding new objects to current implemented specs

In order to add new metrics to the current implementation the process should be simple:

- Look for the segment spec file in `internal/analytics` folder that you want to use
- Add a new struct that accomplish the interface defined at the start of the file with the data that you need for that metric
- Write a constructor for the struct.
- You're done to use!

For any doubts about this document or how to improve the analytics you can reach us on discord!
