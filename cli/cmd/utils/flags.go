package utils

import flag "github.com/spf13/pflag"

// shared sets of flags used by multiple commands
var DriverFlagSet = flag.NewFlagSet("driver", flag.ExitOnError)
var DefaultFlagSet = flag.NewFlagSet("shared", flag.ExitOnError) // used by all commands
var RegistryFlagSet = flag.NewFlagSet("registry", flag.ExitOnError)
var HelmRepoFlagSet = flag.NewFlagSet("helmrepo", flag.ExitOnError)
