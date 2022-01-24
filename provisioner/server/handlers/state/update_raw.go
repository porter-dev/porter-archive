package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/provisioner/server/config"
)

type RawStateUpdateHandler struct {
	Config *config.Config
}

func NewRawStateUpdateHandler(
	config *config.Config,
) *RawStateUpdateHandler {
	return &RawStateUpdateHandler{
		Config: config,
	}
}

func (c *RawStateUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// TODO: read the state from the state storage interface
	fmt.Println("POST raw state handler called")
}

// func UpdateState(c *gin.Context) {
// 	log.Println("updating/creating state")

// 	var state models.TFState
// 	err := c.BindJSON(&state)
// 	if err != nil {
// 		log.Fatalln("cannot read request body", err)
// 	}

// 	orgID := c.Param("org")

// 	data, err := json.Marshal(state)
// 	if err != nil {
// 		log.Printf("cannot marshal json. error: %s\n", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": "cannot marshal JSON",
// 		})

// 		return
// 	}

// 	err = s3Client.PutObject(orgID, "default.tfstate", data)
// 	if err != nil {
// 		log.Printf("cannot create state file. error: %s\n", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": "cannot create state file",
// 		})

// 		return
// 	}

// 	c.JSON(http.StatusCreated, gin.H{})
// 	return
// }
