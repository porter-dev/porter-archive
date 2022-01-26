package grpc

import (
	"fmt"
	"io"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/pb"

	"google.golang.org/grpc/metadata"
)

func (s *ProvisionerServer) StoreLog(stream pb.Provisioner_StoreLogServer) error {
	fmt.Println("HERE")

	// read metadata to get infra object
	streamContext, ok := metadata.FromIncomingContext(stream.Context())

	if !ok {
		fmt.Println("UA 1")
		return fmt.Errorf("unauthorized")
	}

	workspaceID, exists := streamContext["workspace_id"]

	if !exists || len(workspaceID) != 1 {
		fmt.Println("UA 2")
		return fmt.Errorf("unauthorized")
	}

	// TODO: remove this
	if !s.config.ProvisionerConf.Debug {
		// parse workspace id
		_, projID, infraID, _, err := models.ParseUniqueName(workspaceID[0])

		if err != nil {
			fmt.Println("UA 3")
			return err
		}

		_, err = s.config.Repo.Infra().ReadInfra(projID, infraID)

		if err != nil {
			fmt.Println("UA 4")
			return err
		}
	}

	for {
		fmt.Println("LOOPING")

		tfLog, err := stream.Recv()

		if err == io.EOF {
			fmt.Println("END 1")
			return stream.SendAndClose(&pb.TerraformStateMeta{})
		}

		if err != nil {
			fmt.Println("END 2", err)
			return err
		}

		fmt.Println(tfLog)

		// TODO: store in Redis
	}
}

// type HTTPStreamer struct {
// 	client       *http.Client
// 	desiredState models.DesiredTFState
// 	statePosted  bool
// 	serverURL    string
// 	orgID        string
// }

// func (h *HTTPStreamer) Write(p []byte) (int, error) {
// 	for _, line := range bytes.Split(p, []byte("\n")) {
// 		var tfLog models.TFLogLine

// 		if len(line) == 0 {
// 			continue
// 		}

// 		err := json.Unmarshal(line, &tfLog)
// 		if err != nil {
// 			if bytes.Contains(line, []byte("[DEBUG]")) {
// 				// skip this debug line as terraform currently outputs
// 				// this in plaintext even with json flag
// 				printLog(line, err, "skipping debug line")
// 				continue
// 			}

// 			printLog(line, err, "during unmarshalling log line, not a debug line")
// 			continue
// 		}

// 		// send to backend over grpc connection

// 		if tfLog.Type == models.PlannedChange {
// 			h.desiredState = append(h.desiredState, tfLog.Change.Resource)
// 		} else if tfLog.Type == models.ChangeSummary && !h.statePosted {
// 			// consolidated resource list complete
// 			// should be good to POST on server

// 			reqBody, err := json.Marshal(h.desiredState)
// 			if err != nil {
// 				printLog(line, err, "mashalling desired state")
// 				continue
// 			}

// 			endpoint := fmt.Sprintf("%s/%s/state", h.serverURL, h.orgID)

// 			fmt.Println("posting request to", endpoint)
// 			_, err = h.client.Post(endpoint,
// 				"application/json",
// 				bytes.NewReader(reqBody))
// 			if err != nil {
// 				printLog(line, err, "desired state POST response error")
// 				continue
// 			}

// 			h.statePosted = true
// 		} else {
// 			// this is to be directed to the http server for streaming

// 			endpoint := fmt.Sprintf("%s/%s/stream", h.serverURL, h.orgID)

// 			fmt.Println("posting request to", endpoint)
// 			_, err := h.client.Post(endpoint,
// 				"application/json",
// 				bytes.NewReader(line))
// 			if err != nil {
// 				printLog(line, err, "streaming log response error")
// 				continue
// 			}
// 		}
// 	}

// 	return len(p), nil
// }

// func NewHTTPStreamer(tfConf *config.TFConf) *HTTPStreamer {
// 	return &HTTPStreamer{
// 		client: &http.Client{
// 			Timeout: 3 * time.Second,
// 		},
// 		serverURL: tfConf.BackendURL,
// 		orgID:     tfConf.OrgID,
// 	}
// }

// // StreamLogMsg is responsible for handling the POST of the
// // log message from provisioner cli and pushing the content
// // to a redis stream for showing on the UI. It is also
// // responsible for testing and performing some additional
// // tasks like specially handling error messages and resource
// // provisioning completion events
// func StreamLogMsg(c *gin.Context) {
// 	var logMsg models.TFLogLine
// 	orgID := c.Param("org")

// 	err := c.BindJSON(&logMsg)
// 	if err != nil {
// 		log.Println("cannot get json from log msg body. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	filterAndProcessError(orgID, &logMsg)

// 	data, err := json.Marshal(logMsg)
// 	if err != nil {
// 		log.Println("cannot marshal to json for pushing to redis stream, error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	// check if type is error/created/destroyed,
// 	// also push to global stream in that case
// 	if logMsg.Type == models.ApplyErrored {
// 		_, err = redisClient.AddToStream("global", map[string]interface{}{
// 			"id":     orgID,
// 			"status": "error",
// 		})

// 		if err != nil {
// 			log.Println("cannot push to global stream, error:", err.Error())
// 		}
// 	} else if logMsg.Type == models.ChangeSummary {
// 		if strings.Contains(logMsg.Message, "Destroy complete") {
// 			_, err = redisClient.AddToStream("global", map[string]interface{}{
// 				"id":     orgID,
// 				"status": "destroyed",
// 			})
// 		}

// 		if err != nil {
// 			log.Println("cannot push to global stream, error:", err.Error())
// 		}
// 	}

// 	// push to redis
// 	id, err := redisClient.AddToStream(orgID, map[string]interface{}{
// 		"data": data,
// 	})

// 	if err != nil {
// 		log.Println("cannot add to redis stream. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	c.JSON(http.StatusCreated, gin.H{
// 		"id": id,
// 	})

// 	return
// }

// // StreamOutput is the handler responsible for
// // posting the terraform output to the global stream
// func StreamOutput(c *gin.Context) {
// 	orgID := c.Param("org")

// 	body, err := ioutil.ReadAll(c.Request.Body)
// 	if err != nil {
// 		log.Println("cannot read body. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	c.Request.Body.Close()

// 	id, err := redisClient.AddToStream("global", map[string]interface{}{
// 		"id":     orgID,
// 		"status": "created",
// 		"data":   body,
// 	})

// 	if err != nil {
// 		log.Println("cannot push output to global stream. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	log.Println("successfully added output to global stream. id:", id)
// 	c.JSON(http.StatusOK, gin.H{
// 		"id": id,
// 	})

// 	return
// }

// func filterAndProcessError(orgID string, logMsg *models.TFLogLine) {
// 	// process log message to filter out error
// 	err := eventProcessor.Filter(&processor.Event{
// 		OrgID:     orgID,
// 		TFLogLine: logMsg,
// 	})

// 	if err != nil {
// 		log.Printf("cannot mark errored resource %s in desired state\nerror: %s\n",
// 			logMsg.Hook.Resource.Resource,
// 			err.Error())
// 	}
// }
