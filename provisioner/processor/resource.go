package processor

// type EventProcessor struct {}

// type Event struct {
// 	OrgID string
// 	*types.TFLogLine
// }

// func (e *EventProcessor) GetFileData(ordID string) (bytes.Buffer, error) {
// 	var data bytes.Buffer

// 	reader, err := e.client.GetObject(ordID, "desired.json")
// 	if err != nil {
// 		return data, err
// 	}

// 	_, err = data.ReadFrom(reader)
// 	if err != nil {
// 		return data, err
// 	}

// 	return data, nil
// }

// func (e *EventProcessor) WriteFileData(orgID string, data []byte) error {
// 	err := e.client.PutObject(orgID, "desired.json", data)
// 	if err != nil {
// 		return err
// 	}

// 	return nil
// }

// func (e *EventProcessor) MarkErroredResourceInDesiredState(event *Event) error {
// 	fileData, err := e.GetFileData(event.OrgID)
// 	if err != nil {
// 		return err
// 	}

// 	var desiredState types.DesiredTFState
// 	err = json.Unmarshal(fileData.Bytes(), &desiredState)
// 	if err != nil {
// 		return err
// 	}

// 	// find the correct matching resource name in the desired state
// 	for i, resource := range desiredState {
// 		if resource.Resource == event.Hook.Resource.Resource {
// 			// add error message to this resource
// 			resource.Errored.ErroredOut = true
// 			desiredState[i] = resource

// 			// write back the file
// 			data, err := json.Marshal(desiredState)
// 			if err != nil {
// 				return err
// 			}

// 			return e.client.PutObject(event.OrgID, "desired.json", data)
// 		}
// 	}

// 	return fmt.Errorf("cannot find a matching resource entry")
// }

// func (e *EventProcessor) AddErrorContextToResource(event *Event) error {
// 	fileData, err := e.GetFileData(event.OrgID)
// 	if err != nil {
// 		return err
// 	}

// 	var desiredState types.DesiredTFState
// 	err = json.Unmarshal(fileData.Bytes(), &desiredState)
// 	if err != nil {
// 		return err
// 	}

// 	// find and add error context to the matching resource
// 	for i, resource := range desiredState {
// 		if event.Diagnostic.Address == resource.Resource {
// 			resource.Errored.ErrorSummary = event.Diagnostic.Summary
// 			desiredState[i] = resource

// 			// write back
// 			data, err := json.Marshal(desiredState)
// 			if err != nil {
// 				return err
// 			}

// 			return e.client.PutObject(event.OrgID, "desired.json", data)
// 		}
// 	}

// 	return fmt.Errorf("cannot find a matching resource entry")
// }

// func (e *EventProcessor) Filter(event *Event) error {
// 	switch event.Type {
// 	case types.ApplyErrored:
// 		return e.MarkErroredResourceInDesiredState(event)
// 	case types.Diagnostic:
// 		if event.Level == "error" {
// 			return e.AddErrorContextToResource(event)
// 		}

// 		return nil
// 	default:
// 		return nil
// 	}
// }

// func NewEventProcessor() *EventProcessor {
// 	BUCKET := os.Getenv("BUCKET")

// 	return &EventProcessor{
// 		client: s3.NewS3Client(BUCKET),
// 	}
// }
