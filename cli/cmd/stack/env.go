package stack

func CopyEnv(env map[string]string) map[string]string {
	envCopy := make(map[string]string)
	if env == nil {
		return envCopy
	}

	for k, v := range env {
		if k == "" || v == "" {
			continue
		}
		envCopy[k] = v
	}

	return envCopy
}
