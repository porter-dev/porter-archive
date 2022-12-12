package s3

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/storage"
)

type S3StorageClient struct {
	client        s3.Cli
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
	awsConf := &aws.Config{
		Credentials: credentials.NewStaticCredentialsProvider(
			opts.AWSAccessKeyID,
			opts.AWSSecretKey,
			"",
		),
		Region: opts.AWSRegion,
	}

	client := s3.NewFromConfig(awsConf)
	// sess, err = session.NewSessionWithOptions(session.Options{
	// 	SharedConfigState: session.SharedConfigEnable,
	// 	Config:            *awsConf,
	// })

	// if err != nil {
	// 	return nil, fmt.Errorf("cannot create AWS session: %v", err)
	// }

	return &S3StorageClient{
		bucket:        opts.AWSBucketName,
		encryptionKey: opts.EncryptionKey,
		client:        client,
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

	// _, err = s.client.PutObject(&s3.PutObjectInput{
	// 	Body:   aws.ReadSeekCloser(bytes.NewReader(body)),
	// 	Bucket: &s.bucket,
	// 	Key:    aws.String(getKeyFromInfra(infra, name)),
	// })

	return err
}

func (s *S3StorageClient) WriteFileWithKey(fileBytes []byte, shouldEncrypt bool, key string) error {
	ctx := context.Background()

	body := fileBytes
	var err error
	if shouldEncrypt {
		body, err = encryption.Encrypt(fileBytes, s.encryptionKey)

		if err != nil {
			return err
		}
	}

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Body:   types.ReadSeekCloser(bytes.NewReader(body)),
		Bucket: &s.bucket,
		Key:    aws.String(key),
	})

	return err
}

func (s *S3StorageClient) ReadFile(infra *models.Infra, name string, shouldDecrypt bool) ([]byte, error) {
	ctx := context.Background()

	output, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String(getKeyFromInfra(infra, name)),
	})

	if err != nil {
		var nsk *types.NoSuchKey
		if errors.As(err, &nsk) {
			return nil, storage.FileDoesNotExist
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
