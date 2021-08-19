package configloader

import (
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/envloader"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/notifier/sendgrid"
	"github.com/porter-dev/porter/internal/repository/gorm"

	lr "github.com/porter-dev/porter/internal/logger"
)

type EnvConfigLoader struct{}

func NewEnvLoader() shared.ConfigLoader {
	return &EnvConfigLoader{}
}

func (e *EnvConfigLoader) LoadConfig() (*shared.Config, error) {
	envConf, err := envloader.FromEnv()

	if err != nil {
		return nil, err
	}

	capabilities := shared.CapabilitiesFromConf(envConf.ServerConf)

	db, err := adapter.New(envConf.DBConf)

	if err != nil {
		return nil, err
	}

	err = gorm.AutoMigrate(db)

	if err != nil {
		return nil, err
	}

	var key [32]byte

	for i, b := range []byte(envConf.DBConf.EncryptionKey) {
		key[i] = b
	}

	repo := gorm.NewRepository(db, &key)

	// create the session store
	store, err := sessionstore.NewStore(
		&sessionstore.NewStoreOpts{
			SessionRepository: repo.Session(),
			CookieSecrets:     envConf.ServerConf.CookieSecrets,
		},
	)

	if err != nil {
		return nil, err
	}

	tokenConf := &token.TokenGeneratorConf{
		TokenSecret: envConf.ServerConf.TokenGeneratorSecret,
	}

	var notif notifier.UserNotifier = &notifier.EmptyUserNotifier{}

	if capabilities.Email {
		notif = sendgrid.NewUserNotifier(&sendgrid.Client{
			APIKey:                  envConf.ServerConf.SendgridAPIKey,
			PWResetTemplateID:       envConf.ServerConf.SendgridPWResetTemplateID,
			PWGHTemplateID:          envConf.ServerConf.SendgridPWGHTemplateID,
			VerifyEmailTemplateID:   envConf.ServerConf.SendgridVerifyEmailTemplateID,
			ProjectInviteTemplateID: envConf.ServerConf.SendgridProjectInviteTemplateID,
			SenderEmail:             envConf.ServerConf.SendgridSenderEmail,
		})
	}

	return &shared.Config{
		Logger:       lr.NewConsole(envConf.ServerConf.Debug),
		Repo:         repo,
		Capabilities: capabilities,
		Store:        store,
		ServerConf:   envConf.ServerConf,
		TokenConf:    tokenConf,
		UserNotifier: notif,
	}, nil
}
