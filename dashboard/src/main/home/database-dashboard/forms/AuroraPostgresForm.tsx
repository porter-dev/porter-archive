import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import _ from "lodash";
import { v4 as uuidv4 } from 'uuid';

import { hardcodedIcons } from "shared/hardcodedNameDict";
import { Context } from "shared/Context";
import api from "shared/api";
import { pushFiltered } from "shared/routing";

import Back from "components/porter/Back";
import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";
import Button from "components/porter/Button";
import { RouteComponentProps, withRouter } from "react-router";
import Error from "components/porter/Error";
import Fieldset from "components/porter/Fieldset";
import Container from "components/porter/Container";
import ClickToCopy from "components/porter/ClickToCopy";

type Props = RouteComponentProps & {
  currentTemplate: any;
  goBack: () => void;
  repoURL: string | undefined;
};

const AuroraPostgresForm: React.FC<Props> = ({
  currentTemplate,
  goBack,
  repoURL,
  ...props
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [buttonStatus, setButtonStatus] = useState<string>("");
  const [credentialsSaved, setCredentialsSaved] = useState<boolean>(false);
  const [dbName, setDbName] = useState<string>("postgres");
  const [dbPassword, setDbPassword] = useState<string>(uuidv4());
  const [dbUsername, setDbUsername] = useState<string>("postgres");
  const [storage, setStorage] = useState<number>(0);
  const [tier, setTier] = useState<string>("");
  const [hidePassword, setHidePassword] = useState<boolean>(true);

  useEffect(() => {
    if (currentStep === 1) {
      setCurrentStep(3);
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
            pushFiltered(props, "/databases", ["project_id"], {
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

  const deploy = async () => {
    setButtonStatus("loading");

    const values = {
      config: {
        name,
        masterUserPassword: dbPassword,
        allocatedStorage: storage,
        instanceClass: tier,
      }
    }

    api
      .deployAddon(
        "<token>",
        {
          template_name: "rds-postgresql-aurora",
          template_version: "latest",
          values,
          name,
        },
        {
          id: currentProject?.id || -1,
          cluster_id: currentCluster?.id || -1,
          namespace: "ack-system",
          repo_url: repoURL,
        }
      )
      .then((_) => {
        waitForHelmRelease();
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;
        err = parsedErr || err.message || JSON.stringify(err);
        setButtonStatus(err);
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
            title="Create an Aurora PostgreSQL instance"
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
                  placeholder="ex: my-database"
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
                  selected={tier === "db.t4g.medium"}
                  onClick={() => {
                    setStorage(100);
                    setTier("db.t4g.medium");
                  }}
                >
                  <Container row>
                    <Text>Medium</Text>
                    <Spacer inline width="5px" />
                    <Text color="helper">- 2 CPU, 4 GB RAM</Text>
                  </Container>
                  <StorageTag>100 GB Storage</StorageTag>
                </ResourceOption>
                <Spacer height="15px" />
                <ResourceOption
                  selected={tier === "db.t4g.large"}
                  onClick={() => {
                    setStorage(256);
                    setTier("db.t4g.large");
                  }}
                >
                  <Container row>
                    <Text>Large</Text>
                    <Spacer inline width="5px" />
                    <Text color="helper">- 2 CPU, 8 GB RAM</Text>
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
              </>,
              <>
                <Text size={16}>Provision a database</Text>
                <Spacer y={0.5} />
                <Button
                  onClick={deploy}
                  disabled={buttonStatus === "loading"}
                  status={getStatus()}
                >
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

export default withRouter(AuroraPostgresForm);

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