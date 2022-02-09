package handlers

// import (
// 	"bytes"
// 	"encoding/json"
// 	"log"
// 	"net/http"

// 	"github.com/aws/aws-sdk-go/aws/awserr"
// 	"github.com/aws/aws-sdk-go/service/s3"
// 	"github.com/gin-gonic/gin"
// 	"github.com/porter-dev/tf-http-backend/models"
// )

// // SetDesiredState is the POST handler that creates or
// // updates the desired state for a particular provisioning job
// func SetDesiredState(c *gin.Context) {
// 	var desiredState models.DesiredTFState

// 	err := c.BindJSON(&desiredState)
// 	if err != nil {
// 		log.Println("cannot read request body. error:", err.Error())

// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})
// 		return
// 	}

// 	orgID := c.Param("org")

// 	data, err := json.Marshal(desiredState)
// 	if err != nil {
// 		log.Println("cannot marshal json. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	err = s3Client.PutObject(orgID, "desired.json", data)
// 	if err != nil {
// 		log.Printf("cannot create desired state file. error: %s\n", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": "cannot create state file",
// 		})

// 		return
// 	}

// 	c.JSON(http.StatusCreated, gin.H{})
// 	return
// }

// // GetDesiredState is the GET handler for returning
// // the desired state. To be used mostly by the API server
// func GetDesiredState(c *gin.Context) {
// 	var desiredState models.DesiredTFState

// 	orgID := c.Param("org")

// 	reader, err := s3Client.GetObject(orgID, "desired.json")
// 	if err != nil {
// 		if aerr, ok := err.(awserr.Error); ok {
// 			switch aerr.Code() {
// 			case s3.ErrCodeNoSuchKey:
// 				log.Println(aerr.Error())
// 				c.JSON(http.StatusNotFound, gin.H{
// 					"error": aerr.Error(),
// 				})

// 				return
// 			default:
// 				log.Println(aerr.Error())
// 				c.JSON(http.StatusInternalServerError, gin.H{
// 					"error": aerr.Error(),
// 				})

// 				return
// 			}
// 		}

// 		log.Println("cannot cast to awserr. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	var data bytes.Buffer
// 	_, err = data.ReadFrom(reader)
// 	if err != nil {
// 		log.Println("cannot read from reader. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	err = json.Unmarshal(data.Bytes(), &desiredState)
// 	if err != nil {
// 		log.Println("cannot unmarshal desired state. error:", err.Error())
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})

// 		return
// 	}

// 	c.JSON(http.StatusOK, gin.H{
// 		"data": desiredState,
// 	})

// 	return
// }
