package s3

import (
	"bytes"
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
)

type S3StorageClient struct {
	client        *s3.S3
	bucket        string
	encryptionKey *[32]byte
}

func NewS3StorageClient(bucket string, encryptionKey *[32]byte) (*S3StorageClient, error) {
	var sess *session.Session
	var err error

	// TODO: inject AWS config here
	sess, err = session.NewSession()

	if err != nil {
		return nil, fmt.Errorf("cannot create AWS session: %v", err)
	}

	return &S3StorageClient{
		bucket:        bucket,
		encryptionKey: encryptionKey,
		client:        s3.New(sess),
	}, nil
}

func (s *S3StorageClient) WriteFile(infra *models.Infra, name string, fileBytes []byte) error {
	encryptedBody, err := encryption.Encrypt(fileBytes, s.encryptionKey)

	if err != nil {
		return err
	}

	_, err = s.client.PutObject(&s3.PutObjectInput{
		Body:   aws.ReadSeekCloser(bytes.NewReader(encryptedBody)),
		Bucket: &s.bucket,
		Key:    aws.String(getKeyFromInfra(infra, name)),
	})

	return err
}

func (s *S3StorageClient) ReadFile(infra *models.Infra, name string) ([]byte, error) {
	output, err := s.client.GetObject(&s3.GetObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String(getKeyFromInfra(infra, name)),
	})

	if err != nil {
		return nil, err
	}

	var encryptedData bytes.Buffer

	_, err = encryptedData.ReadFrom(output.Body)

	if err != nil {
		return nil, err
	}

	data, err := encryption.Decrypt(encryptedData.Bytes(), s.encryptionKey)

	if err != nil {
		return nil, err
	}

	return data, nil
}

func (s *S3StorageClient) DeleteFile(infra *models.Infra, name string) error {
	_, err := s.client.DeleteObject(&s3.DeleteObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String(getKeyFromInfra(infra, name)),
	})

	if err != nil {
		return err
	}

	return nil
}

func getKeyFromInfra(infra *models.Infra, name string) string {
	return fmt.Sprintf("%s/%s", infra.GetUniqueName(), name)
}
