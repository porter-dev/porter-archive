import React, { Dispatch, SetStateAction, useMemo } from "react";
import RepoSettings from "../../create-app/RepoSettings";
import { useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { useLatestRevision } from "../LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import Checkbox from "components/porter/Checkbox";
import Text from "components/porter/Text";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import { match } from "ts-pattern";
import ImageSettings from "../../image-settings/ImageSettings";

type Props = {
  redeployOnSave: boolean;
  setRedeployOnSave: Dispatch<SetStateAction<boolean>>;
};

const BuildSettings: React.FC<Props> = ({
  redeployOnSave,
  setRedeployOnSave,
}) => {
  const {
    watch,
    formState: { isSubmitting, errors },
  } = useFormContext<PorterAppFormData>();
  const { projectId, latestRevision } = useLatestRevision();

  const build = watch("app.build");
  const source = watch("source");

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (Object.keys(errors).length > 0) {
      return <Error message="Unable to update app" />;
    }

    return "";
  }, [isSubmitting, errors]);

  return (
    <>
      {match(source)
        .with({ type: "github" }, (source) => (
          <RepoSettings
            build={build}
            source={source}
            projectId={projectId}
            appExists
          />
        ))
        .with({ type: "docker-registry" }, (source) => (
          <ImageSettings
            projectId={projectId}
            source={source}
            appExists
          />
        ))
        .exhaustive()
      }
      <Spacer y={1} />
      <Checkbox
        checked={redeployOnSave}
        toggleChecked={() => setRedeployOnSave(!redeployOnSave)}
      >
        <Text>Re-run build and deploy on save</Text>
      </Checkbox>
      <Spacer y={1} />
      <Button
        type="submit"
        status={buttonStatus}
        disabled={
          isSubmitting ||
          latestRevision.status === "CREATED" ||
          latestRevision.status === "AWAITING_BUILD_ARTIFACT"
        }
      >
        Save build settings
      </Button>
    </>
  );
};

export default BuildSettings;
