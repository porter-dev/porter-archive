package project

import (
	"net/http"
	"time"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type ImagesHandler struct {
	handlers.PorterHandlerWriter
}

func NewImagesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ImagesHandler {
	return &ImagesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

type ImageArtifact struct {
	Tag       string    `json:"tag"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Image struct {
	Uri       string          `json:"uri"`
	Artifacts []ImageArtifact `json:"artifacts"`
}

type ImagesReponse struct {
	Images []Image `json:"images"`
}

func (p *ImagesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-images")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	if project.ID == 0 {
		err := telemetry.Error(ctx, span, nil, "project id is 0")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var resp ImagesReponse

	imagesReq := connect.NewRequest(&porterv1.ImagesRequest{
		ProjectId: int64(project.ID),
	})
	ccpResp, err := p.Config().ClusterControlPlaneClient.Images(ctx, imagesReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp rollback porter app")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp is nil")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg.Images == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg images is nil")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	for _, image := range ccpResp.Msg.Images {
		var artifacts []ImageArtifact
		for _, artifact := range image.Artifacts {
			artifacts = append(artifacts, ImageArtifact{
				Tag:       artifact.Tag,
				UpdatedAt: artifact.UpdatedAt.AsTime().UTC(),
			})
		}
		resp.Images = append(resp.Images, Image{
			Uri:       image.Uri,
			Artifacts: artifacts,
		})
	}

	p.WriteResult(w, r, resp)
}
