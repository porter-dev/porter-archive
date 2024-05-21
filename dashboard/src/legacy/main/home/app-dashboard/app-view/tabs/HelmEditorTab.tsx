import React from "react";
import yaml from "js-yaml";
import { useFormContext } from "react-hook-form";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";

import HelmOverrides from "../../validate-apply/helm/HelmOverrides";
import { type ButtonStatus } from "../AppDataContainer";
import AppSaveButton from "../AppSaveButton";
import { useLatestRevision } from "../LatestRevisionContext";

type Props = {
  buttonStatus: ButtonStatus;
  featureFlagEnabled: boolean;
};

const HelmEditorTab: React.FC<Props> = ({
  buttonStatus,
  featureFlagEnabled,
}) => {
  const {
    watch,
    formState: { isSubmitting },
  } = useFormContext<PorterAppFormData>();

  const overrides = watch("app.helmOverrides");
  const { projectId, clusterId, latestProto, deploymentTarget, porterApp } =
    useLatestRevision();

  const appName = latestProto.name;

  const [error, setError] = React.useState<string>("");

  return (
    <>
      {!featureFlagEnabled && (
        <Text color="helper">
          This tab is only visible to Porter operators. Enable the feature flag
          to allow customers to view this.
        </Text>
      )}
      <HelmOverrides
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        deploymentTargetId={deploymentTarget.id}
        appId={porterApp.id}
        overrideValues={overrides ? yaml.dump(JSON.parse(overrides)) : ""}
        setError={setError}
      />
      {error !== "" && <Text color="helper">{error}</Text>}
      <Spacer y={1} />
      <AppSaveButton
        status={buttonStatus}
        isDisabled={isSubmitting || error !== ""}
        disabledTooltipMessage={
          error !== ""
            ? "Error parsing yaml"
            : "Please wait for the new values to apply to complete before updating helm overrides again"
        }
      />
    </>
  );
};

export default HelmEditorTab;
