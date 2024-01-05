import React from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import { type PorterAppFormData } from "lib/porter-apps";

import RepoSettings from "../../create-app/RepoSettings";
import { type ButtonStatus } from "../AppDataContainer";
import AppSaveButton from "../AppSaveButton";
import { useLatestRevision } from "../LatestRevisionContext";

type Props = {
  buttonStatus: ButtonStatus;
};

const BuildSettingsTab: React.FC<Props> = ({ buttonStatus }) => {
  const {
    watch,
    formState: { isSubmitting },
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
            <AppSaveButton
              status={buttonStatus}
              isDisabled={isSubmitting || latestRevision.status === "CREATED"}
              disabledTooltipMessage="Please wait for the build to complete before updating build settings"
            />
          </>
        ))
        .otherwise(() => null)}
    </>
  );
};

export default BuildSettingsTab;
