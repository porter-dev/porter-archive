package preview

type Source struct {
	Name          string
	Repo          string
	Version       string
	IsApplication bool
	SourceValues  map[string]interface{}
}

type Target struct {
	AppName   string
	Project   uint
	Cluster   uint
	Namespace string
}

type RandomStringDriverConfig struct {
	Length int
	Lower  bool
}
