package config

import "strings"

// Version will be linked by an ldflag during build
var Version string = "v0.21.2"

type VersionWriter struct {
	Version string
}

func (v *VersionWriter) Write(p []byte) (n int, err error) {
	v.Version = strings.TrimSpace(string(p))

	return len(p), nil
}
