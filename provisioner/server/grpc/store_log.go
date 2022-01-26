package grpc

import (
	"fmt"
	"io"

	"github.com/porter-dev/porter/provisioner/pb"
)

func (s *ProvisionerServer) StoreLog(stream pb.Provisioner_StoreLogServer) error {
	for {
		tfLog, err := stream.Recv()

		if err == io.EOF {
			return stream.SendAndClose(&pb.TerraformStateMeta{})
		}

		if err != nil {
			return err
		}

		fmt.Println(tfLog)

		// TODO: store in Redis
	}
}

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
