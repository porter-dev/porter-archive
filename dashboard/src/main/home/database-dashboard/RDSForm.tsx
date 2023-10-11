import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import _ from "lodash";
import { v4 as uuidv4 } from 'uuid';

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
import Fieldset from "components/porter/Fieldset";
import Container from "components/porter/Container";
import ClickToCopy from "components/porter/ClickToCopy";

type Props = RouteComponentProps & {
  currentTemplate: any;
  goBack: () => void;
};

const RDSForm: React.FC<Props> = ({
  currentTemplate,
  goBack,
  ...props
}) => {
  const { currentCluster, currentProject, capabilities } = useContext(Context);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [buttonStatus, setButtonStatus] = useState<string>("");
  const [credentialsSaved, setCredentialsSaved] = useState<boolean>(false);
  const [dbName, setDbName] = useState<string>("postgres");
  const [dbPassword, setDbPassword] = useState<string>(uuidv4());
  const [dbUsername, setDbUsername] = useState<string>("postgres");
  const [cpu, setCpu] = useState<number>(0);
  const [ram, setRam] = useState<number>(0);
  const [storage, setStorage] = useState<number>(0);
  const [tier, setTier] = useState<string>("");
  const [hidePassword, setHidePassword] = useState<boolean>(true);

  useEffect(() => {
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  }, [tier]);

  const waitForHelmRelease = () => {
    setTimeout(() => {
      api.getChart(
        "<token>",
        {},
        {
          id: currentProject?.id || -1,
          namespace: "ack-system",
          cluster_id: currentCluster?.id || -1,
          name,
          revision: 0,
        }
      )
        .then((res) => {
          if (res?.data?.version) {
            setButtonStatus("success");
            pushFiltered(props, "/addons", ["project_id"], {
              cluster: currentCluster?.name,
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

  const deploy = async (wildcard?: any) => {
    setButtonStatus("loading");
    
    let values: any = {};
    for (let key in wildcard) {
      _.set(values, key, wildcard[key]);
    }
    /* TODO: Helm installation
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
    */
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
            title="Create an RDS Postgres instance"
            capitalize={false}
            disableLineBreak
          />
          <DarkMatter />
          <VerticalSteps
            currentStep={currentStep}
            steps={[
              <>
                <Text size={16}>Database name</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Lowercase letters, numbers, and "-" only.
                </Text>
                <Spacer height="20px" />
                <Input
                  placeholder="ex: academic-sophon"
                  value={name}
                  width="300px"
                  setValue={(e) => {
                    if (e) {
                      credentialsSaved ? setCurrentStep(2) : setCurrentStep(1);
                    } else {
                      setCurrentStep(0);
                    }
                    setName(e);
                  }}
                />
              </>,
              <>
                <Text size={16}>Database resources</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Specify your database CPU, RAM, and storage.
                </Text>
                <Spacer y={.5} />
                <Text>
                  Select an instance tier:
                </Text>
                <Spacer height="20px" />
                <ResourceOption
                  selected={tier === "small"}
                  onClick={() => {
                    setCpu(2);
                    setRam(2);
                    setStorage(30);
                    setTier("small");
                  }}
                >
                  <Container row>
                    <Text>Small</Text>
                    <Spacer inline width="5px" />
                    <Text color="helper">- 2 CPU, 2 GB RAM</Text>
                  </Container>
                  <StorageTag>30 GB Storage</StorageTag>
                </ResourceOption>
                <Spacer height="15px" />
                <ResourceOption
                  selected={tier === "medium"}
                  onClick={() => {
                    setCpu(4);
                    setRam(4);
                    setStorage(100);
                    setTier("medium");
                  }}
                >
                  <Container row>
                    <Text>Medium</Text>
                    <Spacer inline width="5px" />
                    <Text color="helper">- 4 CPU, 4 GB RAM</Text>
                  </Container>
                  <StorageTag>100 GB Storage</StorageTag>
                </ResourceOption>
                <Spacer height="15px" />
                <ResourceOption
                  selected={tier === "large"}
                  onClick={() => {
                    setCpu(8);
                    setRam(8);
                    setStorage(256);
                    setTier("large");
                  }}
                >
                  <Container row>
                    <Text>Large</Text>
                    <Spacer inline width="5px" />
                    <Text color="helper">- 8 CPU, 8 GB RAM</Text>
                  </Container>
                  <StorageTag>256 GB Storage</StorageTag>
                </ResourceOption>
              </>,
              <>
                <Text size={16}>Database credentials</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  These credentials never leave your own cloud environment. You will be able to automatically import these credentials from any app.
                </Text>
                <Spacer height="20px" />
                <Fieldset>
                  <Text>Postgres DB name</Text>
                  <Spacer y={0.5} />
                  <Text
                    additionalStyles="font-family: monospace;"
                    color="helper"
                  >
                    {dbName}
                  </Text>
                  <Spacer y={1} />
                  <Text>Postgres username</Text>
                  <Spacer y={0.5} />
                  <Text
                    additionalStyles="font-family: monospace;"
                    color="helper"
                  >
                    {dbUsername}
                  </Text>
                  <Spacer y={1} />
                  <Text>Postgres password</Text>
                  <Spacer y={0.5} />
                  <Container row>
                    {hidePassword ? (
                      <>
                        <Blur>{dbPassword}</Blur>
                        <Spacer inline width="10px" />
                        <RevealButton
                          onClick={() => setHidePassword(false)}
                        >
                          Reveal
                        </RevealButton>
                      </>
                    ) : (
                      <>
                        <ClickToCopy color="helper">
                          {dbPassword}
                        </ClickToCopy>
                        <Spacer inline width="10px" />
                        <RevealButton
                          onClick={() => setHidePassword(true)}
                        >
                          Hide
                        </RevealButton>
                      </>
                    )}
                  </Container>
                </Fieldset>
                <Spacer y={1} />
                <Button onClick={() => {
                  setCredentialsSaved(true);
                  setCurrentStep(2);
                }}>
                  Continue
                </Button>
              </>,
              <>
                <Text size={16}>Provision a database</Text>
                <Spacer y={0.5} />
                <Button>
                  Create database
                </Button>
              </>
            ]}
          />
          <Spacer height="80px" />
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
};

export default withRouter(RDSForm);

const RevealButton = styled.div`
  background: ${props => props.theme.fg};
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid #494b4f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    filter: brightness(120%);
  }
`;

const Blur = styled.div`
  filter: blur(5px);
  -webkit-filter: blur(5px);
  position: relative;
  margin-left: -5px;
  font-family: monospace;
`;

const StorageTag = styled.div`
  background: #202227;
  color: #aaaabb;
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 13px;
  margin-left: 5px;
`;

const ResourceOption = styled.div<{ selected?: boolean }>`
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid ${props => props.selected ? "#ffffff" : props.theme.border};
  width: 350px;
  padding: 10px 15px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  :hover {
    border: 1px solid #ffffff;
  }
`;

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