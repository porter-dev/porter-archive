import React, { useMemo } from "react";
import RepoSettings from "../../create-app/RepoSettings";
import { useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { useLatestRevision } from "../LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import { match } from "ts-pattern";
import { ButtonStatus } from "../AppDataContainer";

type Props = {
  buttonStatus: ButtonStatus;
};

const BuildSettingsTab: React.FC<Props> = ({ buttonStatus }) => {
  const {
    watch,
    formState: { isSubmitting, errors },
  } = useFormContext<PorterAppFormData>();
  const { projectId, latestRevision } = useLatestRevision();

  const build = watch("app.build");
  const source = watch("source");

  return (
    <>
      {match(source)
        .with({ type: "github" }, (source) => (
          <>
            <RepoSettings
              build={build}
              source={source}
              projectId={projectId}
              appExists
            />
            <Spacer y={1} />
            <Button
              type="submit"
              status={buttonStatus}
              disabled={
                isSubmitting ||
                latestRevision.status === "CREATED"
              }
              disabledTooltipMessage="Please wait for the build to complete before updating build settings"
            >
              Save build settings
            </Button>
          </>
        ))
        .otherwise(() => null)}
    </>
  );
};

export default BuildSettingsTab;
