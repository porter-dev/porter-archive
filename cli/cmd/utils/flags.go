package utils

import flag "github.com/spf13/pflag"

// shared sets of flags used by multiple commands
var (
	DriverFlagSet   = flag.NewFlagSet("driver", flag.ExitOnError)
	DefaultFlagSet  = flag.NewFlagSet("shared", flag.ExitOnError) // used by all commands
	RegistryFlagSet = flag.NewFlagSet("registry", flag.ExitOnError)
	HelmRepoFlagSet = flag.NewFlagSet("helmrepo", flag.ExitOnError)
)
