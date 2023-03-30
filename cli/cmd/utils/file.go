package utils

import (
	"fmt"
	"os"
	"path/filepath"
)

func GetFileReferenceFromKubeconfig(
	filename string,
	kubeconfigPath string,
) (string, error) {
	if info, err := os.Stat(filename); os.IsNotExist(err) && !info.IsDir() {
		// attempt to discover the filename relative to the kubeconfig location
		absPath, err := filepath.Abs(kubeconfigPath)
		if err != nil {
			return "", err
		}

		fPath := filepath.Join(filepath.Dir(absPath), filename)

		if info, err := os.Stat(fPath); !os.IsNotExist(err) && !info.IsDir() {
			return fPath, nil
		} else {
			return "", fmt.Errorf("%s not found", filename)
		}
	} else if info.IsDir() {
		return "", fmt.Errorf("%s is a directory", filename)
	}

	return filename, nil
}
