package s3

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/porter-dev/tf-http-backend/pkg/encryption"
)

type Client struct {
	client *s3.S3
	bucket string
}

var LOCAL_RUN string
var ENCRYPT_KEY string

func init() {
	LOCAL_RUN = os.Getenv("LOCAL_RUN")

	ENCRYPT_KEY = os.Getenv("ENCRYPT_KEY")

	if ENCRYPT_KEY == "" {
		if LOCAL_RUN == "true" {
			ENCRYPT_KEY = "the-key-has-to-be-32-bytes-long!"
		} else {
			panic("no encryption key set for storage")
		}
	}
}

func NewS3Client(bucket string) *Client {
	var sess *session.Session
	var err error

	if LOCAL_RUN == "true" {
		sess, err = session.NewSession(&aws.Config{
			Region:   aws.String("us-east-1"),
			Endpoint: aws.String("localhost.localstack.cloud:4566"),
		})
	} else {
		sess, err = session.NewSession()
		if err != nil {
			log.Fatal("cannot create aws session", err.Error())
		}
	}

	return &Client{
		client: s3.New(sess),
		bucket: bucket,
	}
}

func (s *Client) GetObject(org, filename string) (io.ReadCloser, error) {
	log.Println(org, filename)
	output, err := s.client.GetObject(&s3.GetObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String(fmt.Sprintf("%s/%s", org, filename)),
	})

	if err != nil {
		return nil, err
	}

	var encryptedData bytes.Buffer
	_, err = encryptedData.ReadFrom(output.Body)
	if err != nil {
		return nil, err
	}

	data, err := encryption.Decrypt(encryptedData.Bytes(), []byte(ENCRYPT_KEY))
	if err != nil {
		return nil, err
	}

	return io.NopCloser(bytes.NewReader(data)), nil
}

func (s *Client) PutObject(org, filename string, body []byte) error {
	encryptedBody, err := encryption.Encrypt(body, []byte(ENCRYPT_KEY))
	if err != nil {
		return err
	}

	_, err = s.client.PutObject(&s3.PutObjectInput{
		Body:   aws.ReadSeekCloser(bytes.NewReader(encryptedBody)),
		Bucket: &s.bucket,
		Key:    aws.String(fmt.Sprintf("%s/%s", org, filename)),
	})

	if err != nil {
		return err
	}

	return nil
}

func (s *Client) DeleteObject(org, filename string) error {
	_, err := s.client.DeleteObject(&s3.DeleteObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String(fmt.Sprintf("%s/%s", org, filename)),
	})

	if err != nil {
		return err
	}

	return nil
}
