package upgrade

import (
	semver "github.com/Masterminds/semver/v3"
	"sigs.k8s.io/yaml"
)

// UpgradeFile is a collection of upgrade notes between specific versions
type UpgradeFile struct {
	UpgradeNotes []*UpgradeNote `yaml:"upgrade_notes"`
}

// UpgradeNote is a single note for upgrading between a previous version and
// a target version.
type UpgradeNote struct {
	PreviousVersion string `yaml:"previous"`
	TargetVersion   string `yaml:"target"`
	Note            string `yaml:"note"`
}

// ParseUpgradeFileFromBytes parses the raw bytes of an upgrade file and returns an
// UpgradeFile object. sigs.k8s.io/yaml parser is used.
func ParseUpgradeFileFromBytes(upgradeNotes []byte) (*UpgradeFile, error) {
	// parse bytes into object
	res := &UpgradeFile{}

	err := yaml.Unmarshal(bytes, form)

	if err != nil {
		return nil, err
	}

	return res, err
}

// GetUpgradeFileBetweenVersions gets the set of upgrade notes that are applicable to an upgrade
// between a previous and target version.
func (u *UpgradeFile) GetUpgradeFileBetweenVersions(prev, target string) (*UpgradeFile, error) {
	prevVersion, err := semver.NewVersion(prev)

	if err != nil {
		return nil, err
	}

	targetVersion, err := semver.NewVersion(target)

	if err != nil {
		return nil, err
	}

	// for each upgrade note, determine if it's geq than the previous version, leq the target
	// version
	resNotes := make([]*UpgradeNote, 0)

	for _, note := range u.UpgradeNotes {
		notePrevVersion, err := semver.NewVersion(note.PreviousVersion)

		if err != nil {
			return nil, err
		}

		noteTargetVersion, err := semver.NewVersion(note.PreviousVersion)

		if err != nil {
			return nil, err
		}

		// check that the previous version is not smaller than the note previous version
		if comp := prevVersion.Compare(notePrevVersion); comp != -1 {
			// check that the target version is not larger than the note target version
			if comp := targetVersion.Compare(noteTargetVersion); comp != 1 {
				resNotes := append(resNotes, note)
			}
		}
	}

	return &UpgradeFile{
		UpgradeNotes: resNotes,
	}, nil
}
