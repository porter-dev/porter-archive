package handlers

// import (
// 	"bytes"
// 	"encoding/json"
// 	"log"
// 	"net/http"

// 	"github.com/gin-gonic/gin"
// 	"github.com/porter-dev/tf-http-backend/models"
// )

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
