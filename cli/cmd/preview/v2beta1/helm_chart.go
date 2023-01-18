package v2beta1

func (c *HelmChart) GetName() string {
	if c == nil || c.Name == nil {
		return ""
	}

	return *c.Name
}

func (c *HelmChart) GetURL() string {
	if c == nil || c.URL == nil {
		return ""
	}

	return *c.URL
}

func (c *HelmChart) GetVersion() string {
	if c == nil || c.Version == nil {
		return ""
	}

	return *c.Version
}
