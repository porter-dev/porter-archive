package utils

import "github.com/gosimple/slug"

const maxLength = 63

// ValidDNSLabel converts a string to a valid DNS label (RFC 1123)
// "a lowercase RFC 1123 label must consist of lower case alphanumeric characters or '-', and must start and end with an alphanumeric character"
func ValidDNSLabel(value string) string {
	slug.CustomSub = map[string]string{
		"_": "-",
	}
	slug.Lowercase = true

	// As per slug docs, Minus sign and underscore characters will never appear at the beginning or the end of the returned string
	slug := slug.Make(value)

	if len(slug) > maxLength {
		slug = slug[:maxLength]
	}

	return slug
}
