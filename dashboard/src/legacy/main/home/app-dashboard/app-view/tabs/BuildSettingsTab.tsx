import React from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";

import { BuildSettings } from "../../create-app/BuildSettings";
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
  const { projectId } = useLatestRevision();

  const build = watch("app.build");
  const source = watch("source");

  return (
    <>
      <Text size={16}>Build settings</Text>
      <Spacer y={0.5} />
      {match(source)
        .with({ type: "github" }, (source) => (
          <RepoSettings
            build={build}
            source={source}
            projectId={projectId}
            appExists
          />
        ))
        .with({ type: "local" }, (source) => (
          <BuildSettings
            projectId={projectId}
            source={source}
            build={build}
            appExists
          />
        ))
        .otherwise(() => null)}
      <Spacer y={1} />
      <AppSaveButton
        status={buttonStatus}
        isDisabled={isSubmitting}
        disabledTooltipMessage="Please wait for the build to complete before updating build settings"
      />
    </>
  );
};

export default BuildSettingsTab;
