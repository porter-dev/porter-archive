package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/provisioner/server/config"
)

type RawStateGetHandler struct {
	Config *config.Config
}

func NewRawStateGetHandler(
	config *config.Config,
) *RawStateGetHandler {
	return &RawStateGetHandler{
		Config: config,
	}
}

func (c *RawStateGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// TODO: read the state from the state storage interface
	fmt.Println("GET raw state handler called")
}

// func GetState(c *gin.Context) {
// 	orgID := c.Param("org")

// 	stateFile, err := s3Client.GetObject(orgID, "default.tfstate")
// 	if err != nil {
// 		log.Println("cannot find state file. error: ", err.Error())
// 		log.Println("must be an init operation")

// 		c.JSON(http.StatusNotFound, gin.H{
// 			"error": err.Error(),
// 		})
// 		return
// 	}

// 	defer stateFile.Close()

// 	var data bytes.Buffer

// 	readCount, err := data.ReadFrom(stateFile)
// 	if err != nil {
// 		log.Println("cannot read state file. error: ", err.Error())

// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	log.Println("read", readCount, "bytes")
// 	if readCount == 0 {
// 		// empty state file, delete it
// 		log.Println("detected empty state file, deleting for sanity")
// 		s3Client.DeleteObject(orgID, "default.tfstate")

// 		c.JSON(http.StatusNotFound, gin.H{})
// 		return
// 	}

// 	body := make(gin.H)

// 	err = json.Unmarshal(data.Bytes(), &body)
// 	if err != nil {
// 		log.Println("error unmarshaling the state. error: ", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	c.JSON(http.StatusOK, body)
// }
