package upgrade

import (
	"fmt"

	semver "github.com/Masterminds/semver/v3"
	"sigs.k8s.io/yaml"
)

// UpgradeFile is a collection of upgrade notes between specific versions
type UpgradeFile struct {
	UpgradeNotes []*UpgradeNote `yaml:"upgrade_notes" json:"upgrade_notes"`
}

// UpgradeNote is a single note for upgrading between a previous version and
// a target version.
type UpgradeNote struct {
	PreviousVersion string `yaml:"previous" json:"previous"`
	TargetVersion   string `yaml:"target" json:"target"`
	Note            string `yaml:"note" json:"note"`
}

// ParseUpgradeFileFromBytes parses the raw bytes of an upgrade file and returns an
// UpgradeFile object. sigs.k8s.io/yaml parser is used.
func ParseUpgradeFileFromBytes(upgradeNotes []byte) (*UpgradeFile, error) {
	// parse bytes into object
	res := &UpgradeFile{}

	err := yaml.Unmarshal(upgradeNotes, res)

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
		fmt.Println("ONE NOTE IS", note)

		notePrevVersion, err := semver.NewVersion(note.PreviousVersion)

		if err != nil {
			return nil, err
		}

		noteTargetVersion, err := semver.NewVersion(note.TargetVersion)

		if err != nil {
			return nil, err
		}

		fmt.Println(prev, target, prevVersion.Compare(notePrevVersion), targetVersion.Compare(noteTargetVersion))

		// check that the previous version is not smaller than the note previous version
		if comp := prevVersion.Compare(notePrevVersion); comp != -1 {
			// check that the target version is smaller than the note target version
			if comp := targetVersion.Compare(noteTargetVersion); comp != -1 {
				resNotes = append(resNotes, note)
			}
		}
	}

	return &UpgradeFile{
		UpgradeNotes: resNotes,
	}, nil
}
