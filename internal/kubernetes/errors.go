package kubernetes

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"syscall"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
)

func CatchK8sConnectionError(err error) error {
	if uerr, ok := err.(*url.Error); ok {
		if noerr, ok := uerr.Err.(*net.OpError); ok {
			if scerr, ok := noerr.Err.(*os.SyscallError); ok {
				if scerr.Err == syscall.ECONNREFUSED {
					return &ErrConnection{
						k8sErr: err,
					}
				}
			}
		}
	}

	if k8sErrors.IsTimeout(err) {
		return &ErrConnection{
			k8sErr: err,
		}
	}

	if k8sErrors.IsUnauthorized(err) || k8sErrors.IsForbidden(err) {
		return &ErrUnauthorized{
			k8sErr: err,
		}
	}

	return &ErrUnknown{
		k8sErr: err,
	}
}

type ErrUnknown struct {
	k8sErr error
}

func (e *ErrUnknown) Error() string {
	return fmt.Sprintf("Unknown or unhandled error: %s", e.k8sErr.Error())
}

// For ECONNREFUSED and errors.IsTimeout
type ErrConnection struct {
	k8sErr error
}

func (e *ErrConnection) Error() string {
	return fmt.Sprintf("Could not connect to cluster: %s", e.k8sErr.Error())
}

// For errors.IsForbidden and errors.IsUnauthorized
type ErrUnauthorized struct {
	k8sErr error
}

func (e *ErrUnauthorized) Error() string {
	return fmt.Sprintf("Unauthorized: %s", e.k8sErr.Error())
}
