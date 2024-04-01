package v2

import (
	"context"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ProtoFromAddon converts an Addon to the Addon proto type
func ProtoFromAddon(ctx context.Context, addon Addon) (*porterv1.Addon, error) {
	ctx, span := telemetry.NewSpan(ctx, "proto-from-addon")
	defer span.End()

	addonProto := &porterv1.Addon{
		Name: addon.Name,
	}

	addonType, err := addonEnumProtoFromType(ctx, addon.Type)
	if err != nil {
		return addonProto, telemetry.Error(ctx, span, err, "error getting addon type")
	}

	switch addonType {
	case porterv1.AddonType_ADDON_TYPE_POSTGRES:
		addonProto.Type = addonType
		postgres := postgresConfigProtoFromAddon(addon)

		addonProto.Config = &porterv1.Addon_Postgres{
			Postgres: postgres,
		}
	case porterv1.AddonType_ADDON_TYPE_REDIS:
		addonProto.Type = addonType
		redis := redisConfigProtoFromAddon(addon)

		addonProto.Config = &porterv1.Addon_Redis{
			Redis: redis,
		}
	default:
		return addonProto, telemetry.Error(ctx, span, nil, "specified addon type not supported")
	}

	var envGroups []*porterv1.EnvGroup

	for _, envGroup := range addon.EnvGroups {
		eg := &porterv1.EnvGroup{
			Name:    envGroup,
			Version: 0, // this is updated to latest when applied to cluster
		}
		envGroups = append(envGroups, eg)
	}
	addonProto.EnvGroups = envGroups

	return addonProto, nil
}

func addonEnumProtoFromType(ctx context.Context, addonType string) (porterv1.AddonType, error) {
	ctx, span := telemetry.NewSpan(ctx, "addon-enum-proto-from-type")
	defer span.End()

	var addonTypeEnum porterv1.AddonType

	switch addonType {
	case "postgres":
		addonTypeEnum = porterv1.AddonType_ADDON_TYPE_POSTGRES
	case "redis":
		addonTypeEnum = porterv1.AddonType_ADDON_TYPE_REDIS
	default:
		return addonTypeEnum, telemetry.Error(ctx, span, nil, "invalid addon type")
	}

	return addonTypeEnum, nil
}

func postgresConfigProtoFromAddon(addon Addon) *porterv1.Postgres {
	return &porterv1.Postgres{
		RamMegabytes:     int32(addon.RamMegabytes),
		CpuCores:         addon.CpuCores,
		StorageGigabytes: int32(addon.StorageGigabytes),
	}
}

func redisConfigProtoFromAddon(addon Addon) *porterv1.Redis {
	return &porterv1.Redis{
		RamMegabytes:     int32(addon.RamMegabytes),
		CpuCores:         addon.CpuCores,
		StorageGigabytes: int32(addon.StorageGigabytes),
	}
}
