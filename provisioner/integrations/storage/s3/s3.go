package s3

import (
	"bytes"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/storage"
)

type S3StorageClient struct {
	client        *s3.S3
	bucket        string
	encryptionKey *[32]byte
}

type S3Options struct {
	AWSRegion      string
	AWSAccessKeyID string
	AWSSecretKey   string
	AWSBucketName  string
	EncryptionKey  *[32]byte
}

func NewS3StorageClient(opts *S3Options) (*S3StorageClient, error) {
	var sess *session.Session
	var err error

	awsConf := &aws.Config{
		Credentials: credentials.NewStaticCredentials(
			opts.AWSAccessKeyID,
			opts.AWSSecretKey,
			"",
		),
		Region: &opts.AWSRegion,
	}

	sess, err = session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
		Config:            *awsConf,
	})

	if err != nil {
		return nil, fmt.Errorf("cannot create AWS session: %v", err)
	}

	return &S3StorageClient{
		bucket:        opts.AWSBucketName,
		encryptionKey: opts.EncryptionKey,
		client:        s3.New(sess),
	}, nil
}

func (s *S3StorageClient) WriteFile(infra *models.Infra, name string, fileBytes []byte, shouldEncrypt bool) error {
	body := fileBytes
	var err error
	if shouldEncrypt {
		body, err = encryption.Encrypt(fileBytes, s.encryptionKey)

		if err != nil {
			return err
		}
	}

	_, err = s.client.PutObject(&s3.PutObjectInput{
		Body:   aws.ReadSeekCloser(bytes.NewReader(body)),
		Bucket: &s.bucket,
		Key:    aws.String(getKeyFromInfra(infra, name)),
	})

	return err
}

func (s *S3StorageClient) WriteFileWithKey(fileBytes []byte, shouldEncrypt bool, key string) error {
	body := fileBytes
	var err error
	if shouldEncrypt {
		body, err = encryption.Encrypt(fileBytes, s.encryptionKey)

		if err != nil {
			return err
		}
	}

	_, err = s.client.PutObject(&s3.PutObjectInput{
		Body:   aws.ReadSeekCloser(bytes.NewReader(body)),
		Bucket: &s.bucket,
		Key:    aws.String(key),
	})

	return err
}

func (s *S3StorageClient) ReadFile(infra *models.Infra, name string, shouldDecrypt bool) ([]byte, error) {
	output, err := s.client.GetObject(&s3.GetObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String(getKeyFromInfra(infra, name)),
	})

	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			case s3.ErrCodeNoSuchKey:
				return nil, storage.FileDoesNotExist
			default:
				return nil, err
			}
		}

		return nil, err
	}

	if shouldDecrypt {
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
	} else {
		return io.ReadAll(output.Body)
	}
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
