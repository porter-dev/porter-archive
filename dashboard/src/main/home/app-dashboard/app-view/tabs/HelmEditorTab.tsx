import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import HelmOverrides from "../../validate-apply/helm/HelmOverrides";
import { useFormContext } from "react-hook-form";
import { PorterAppFormData } from "../../../../../lib/porter-apps";
import Button from "../../../../../components/porter/Button";
import { ButtonStatus } from "../AppDataContainer";
import yaml from "js-yaml";
import Text from "../../../../../components/porter/Text";
import Spacer from "../../../../../components/porter/Spacer";

type Props = {
  buttonStatus: ButtonStatus;
  featureFlagEnabled: boolean;
};

const HelmEditorTab: React.FC<Props> = ({ buttonStatus, featureFlagEnabled }) => {
  const {
    watch,
    formState: { isSubmitting, errors },
    setValue,
  } = useFormContext<PorterAppFormData>();

  const overrides = watch("app.helmOverrides");
  const {
    projectId,
    clusterId,
    latestProto,
    deploymentTarget,
    porterApp,
    latestRevision,
  } = useLatestRevision();

  const appName = latestProto.name;

  const [error, setError] = React.useState<string>("");

  return (
    <>
      {!featureFlagEnabled && <Text color="helper">This tab is only visible to Porter operators.</Text>}
      <HelmOverrides
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        deploymentTargetId={deploymentTarget.id}
        appId={porterApp.id}
        overrideValues={(overrides == "" || overrides == null) ? "" : yaml.dump(JSON.parse( overrides))}
        setError={setError}
      />
      {error != "" && <Text color="helper">{error}</Text>}
      <Spacer y={1} />
      <Button
        type="submit"
        status={buttonStatus}
        disabled={
          isSubmitting ||
          latestRevision.status === "CREATED" ||
          latestRevision.status === "AWAITING_BUILD_ARTIFACT" ||
          error != ""
        }
        disabledTooltipMessage={
          error != ""
            ? "Error parsing yaml"
            : "Please wait for the new values to apply to complete before updating helm overrides again"
        }
      >
        Save Helm overrides
      </Button>
    </>
  );
};

export default HelmEditorTab;
