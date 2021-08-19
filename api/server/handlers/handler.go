package handlers

type PorterHandler interface{
	Config() *shared.Config
}

type PorterHandlerWriter interface{
	PorterHandler
	WriteResult(w http.ResponseWriter, v interface{})
}

type PorterHandlerReader interface{
	PorterHandler
	DecodeAndValidate(w http.ResponseWriter, r *http.Request, v interface{})
}

type PorterHandlerReadWriter interface{
	PorterHandlerWriter
	PorterHandlerReader
}

// default

// type PorterHandler struct {
// 	config           *shared.Config
// 	decoderValidator shared.RequestDecoderValidator
// 	writer           shared.ResultWriter
// }

// handler needs:
// - interface for decodervalidator+writer
// - shared configuration
// - writer
// - context set (user, project, etc)
// - standard error


// notes:
// decode and validate should happen above the handler itself. the scopes and strongly typed 

// "handlers" refer to an aggregation of application-logic. they should not contain any logic
// for:
// - error aggregation (so they accept api error interface)
// - analytics
// - authentication
// - reading in required context (part of authentication)

// ProjectScopedHandler()
// - read project model from context 
// - so "Get Project" accepts a ProjectGetter, which calls readUser() and readProject()

// The errors that a handler can throw should be defined in API spec

type UserGetter struct {
	readUser() *models.User
}

type ProjectGetter struct {
	UserGetter

	readProject() *models.Project
}