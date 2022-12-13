package s3

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/storage"
)

type S3StorageClient struct {
	client        *s3.Client
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

	awsConf := aws.Config{
		Credentials: credentials.NewStaticCredentialsProvider(
			opts.AWSAccessKeyID,
			opts.AWSSecretKey,
			"",
		),
		Region: opts.AWSRegion,
	}

	// TODO: delete this comment by 2023-01-30 if no issues are noticed when creating a new S3 client
	// aws-sdk-go used a SharedConfigState: enabled which is no longer available in v2, without specifying the file name
	client := s3.NewFromConfig(awsConf)

	return &S3StorageClient{
		bucket:        opts.AWSBucketName,
		encryptionKey: opts.EncryptionKey,
		client:        client,
	}, nil
}

func (s *S3StorageClient) WriteFile(infra *models.Infra, name string, fileBytes []byte, shouldEncrypt bool) error {
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
		Body:   manager.ReadSeekCloser(bytes.NewReader(body)),
		Bucket: &s.bucket,
		Key:    aws.String(getKeyFromInfra(infra, name)),
	})

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
		Body:   manager.ReadSeekCloser(bytes.NewReader(body)),
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
	ctx := context.Background()

	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
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
