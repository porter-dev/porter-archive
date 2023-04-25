import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import _ from "lodash";

import { hardcodedNames, hardcodedIcons } from "shared/hardcodedNameDict";
import { Context } from "shared/Context";
import api from "shared/api";
import { pushFiltered } from "shared/routing";

import Back from "components/porter/Back";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import Link from "components/porter/Link";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import Placeholder from "components/Placeholder";
import Button from "components/porter/Button";
import { generateSlug } from "random-word-slugs";
import { RouteComponentProps, withRouter } from "react-router";
import Error from "components/porter/Error";

type Props = RouteComponentProps & {
  currentTemplate: any;
  currentForm?: any;
  goBack: () => void;
};

const ConfigureTemplate: React.FC<Props> = ({
  currentTemplate,
  currentForm,
  goBack,
  ...props
}) => {
  const { currentCluster, currentProject, capabilities } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [buttonStatus, setButtonStatus] = useState<string>("");

  const waitForHelmRelease = () => {
    setTimeout(() => {
      api.getChart(
        "<token>",
        {},
        {
          id: currentProject.id,
          namespace: "default",
          cluster_id: currentCluster.id,
          name,
          revision: 0,
        }
      )
        .then((res) => {
          if (res?.data?.version) {
            setButtonStatus("success");
            pushFiltered(props, "/addons", ["project_id"], {
              cluster: currentCluster.name,
            });
          } else {
            waitForHelmRelease();
          }
        })
        .catch((err) => {
          waitForHelmRelease();
        });
    }, 500);
  };

  const deployAddOn = async (wildcard?: any) => {
    setButtonStatus("loading");
    
    let values: any = {};
    for (let key in wildcard) {
      _.set(values, key, wildcard[key]);
    }
    console.log("values", values)
    console.log("wildcard", wildcard)
    api
      .deployAddon(
        "<token>",
        {
          template_name: currentTemplate.name,
          template_version: "latest",
          values: values,
          name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: "default",
          repo_url: currentTemplate?.repo_url || capabilities.default_addon_helm_repo_url,
        }
      )
      .then((_) => {
        window.analytics?.track("Deployed Add-on", {
          name: currentTemplate.name,
          namespace: "default",
          values: values,
        });
        waitForHelmRelease();
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;
        err = parsedErr || err.message || JSON.stringify(err);
        setButtonStatus(err);
        window.analytics?.track("Failed to Deploy Add-on", {
          name: currentTemplate.name,
          namespace: "default",
          values: values,
          error: err,
        });
        return;
      });
  };

  const getStatus = () => {
    if (!buttonStatus) {
      return;
    }
    if (buttonStatus === "loading" || buttonStatus === "success") {
      return buttonStatus;
    } else {
      return (
        <Error message={buttonStatus} />
      );
    }
  };
  
  const renderAddOnSettings = () => {
    if (currentForm) {
      return (
        <PorterFormWrapper
          formData={currentForm}
          valuesToOverride={{
            namespace: "default",
            clusterId: currentCluster.id,
          }}
          buttonStatus={getStatus()}
          isLaunch={true}
          onSubmit={deployAddOn}
        />
      );
    } else {
      return (
        <>
          <Placeholder>
            <div>
              To configure this chart through Porter
              <Spacer inline width="5px" />
              <Link
                target="_blank"
                to="https://github.com/porter-dev/porter-charts/blob/master/docs/form-yaml-reference.md"
              >
                refer to our docs
              </Link>
              .
            </div>
          </Placeholder>
          <Spacer y={1.2} />
          <Button
            width="150px"
            onClick={deployAddOn}
            status={getStatus()}
          >
            Deploy application
          </Button>
        </>
      );
    };
  };

  return (
    <CenterWrapper>
      <Div>
        <StyledConfigureTemplate>
          <Back onClick={goBack} />
          <DashboardHeader
            prefix={
              <Icon 
                src={hardcodedIcons[currentTemplate.name] || currentTemplate.icon}
              />
            }
            title={`Configure new ${hardcodedNames[currentTemplate.name] || currentTemplate.name} instance`}
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
                  Randomly generated if left blank (lowercase letters, numbers, and "-" only).
                </Text>
                <Spacer height="20px" />
                <Input
                  placeholder="ex: academic-sophon"
                  value={name}
                  width="300px"
                  setValue={(e) => {
                    if (e) {
                      setCurrentStep(1);
                    } else {
                      setCurrentStep(0);
                    }
                    setName(e);
                  }}
                />
              </>,
              <>
                <Text size={16}>Add-on settings</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                Configure settings for this add-on.
                </Text>
                <Spacer height="20px" />
                {renderAddOnSettings()}
              </>
            ]}
          />
          <Spacer height="80px" />
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
};

export default withRouter(ConfigureTemplate);

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