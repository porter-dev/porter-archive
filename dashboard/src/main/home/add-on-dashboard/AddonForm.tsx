import React, { useContext, useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";

import Loading from "components/Loading";
import Back from "components/porter/Back";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { defaultClientAddon, type ClientAddon } from "lib/addons";
import { type AddonTemplate } from "lib/addons/template";
import { useAddonList } from "lib/hooks/useAddon";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";

import { Context } from "shared/Context";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import ClusterContextProvider from "../infrastructure-dashboard/ClusterContextProvider";
import Configuration from "./tabs/Configuration";

type Props = {
  template: AddonTemplate;
};
const AddonForm: React.FC<Props> = ({ template }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const { defaultDeploymentTarget, isDefaultDeploymentTargetLoading } =
    useDefaultDeploymentTarget();

  const history = useHistory();
  const { addons, isLoading: isAddonListLoading } = useAddonList({
    projectId: currentProject?.id,
    deploymentTargetId: defaultDeploymentTarget.id,
  });

  const {
    reset,
    register,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<ClientAddon>();
  const watchName = watch("name.value", "");
  const currentStep = useMemo(() => {
    if (!watchName) {
      return 0;
    }
    return 1;
  }, [watchName]);

  useEffect(() => {
    reset(defaultClientAddon(template.type));
  }, [template]);

  useEffect(() => {
    if (addons.map((a) => a.name.value).includes(watchName)) {
      setError("name.value", {
        message: "An addon with this name already exists",
      });
    } else {
      clearErrors("name.value");
    }
  }, [watchName]);

  if (isDefaultDeploymentTargetLoading || isAddonListLoading) {
    return <Loading />;
  }

  return (
    <ClusterContextProvider clusterId={currentCluster?.id} refetchInterval={0}>
      <CenterWrapper>
        <Div>
          <StyledConfigureTemplate>
            <Back
              onClick={() => {
                history.push(`/addons/new`);
              }}
            />
            <DashboardHeader
              prefix={<Icon src={template.icon} />}
              title={`Configure new "${template.displayName}" instance`}
              capitalize={false}
              disableLineBreak
            />
            <DarkMatter />
            <VerticalSteps
              currentStep={currentStep}
              steps={[
                <>
                  <Text size={16}>Add-on name</Text>
                  <Spacer y={0.5} />
                  <Text color="helper">
                    Lowercase letters, numbers, and &quot;-&quot; only.
                  </Text>
                  <Spacer height="20px" />
                  <ControlledInput
                    type="text"
                    width="300px"
                    placeholder="ex: my-addon"
                    error={errors.name?.value?.message}
                    {...register("name.value")}
                  />
                </>,
                <>
                  <Configuration type={template.type} />
                </>,
              ]}
            />
            <Spacer height="80px" />
          </StyledConfigureTemplate>
        </Div>
      </CenterWrapper>
    </ClusterContextProvider>
  );
};

export default AddonForm;

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 30px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;
