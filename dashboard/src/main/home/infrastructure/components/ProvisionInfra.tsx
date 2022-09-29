import React, { useContext, useState, useEffect } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import Loading from "components/Loading";
import TitleSection from "components/TitleSection";

import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import Placeholder from "components/Placeholder";
import AWSCredentialsList from "./credentials/AWSCredentialList";
import Heading from "components/form-components/Heading";
import GCPCredentialsList from "./credentials/GCPCredentialList";
import DOCredentialsList from "./credentials/DOCredentialList";
import { getQueryParam, useRouting } from "shared/routing";
import {
  InfraTemplateMeta,
  InfraTemplate,
  InfraCredentials,
  ClusterType,
} from "shared/types";
import Description from "components/Description";
import Select from "components/porter-form/field-components/Select";
import ClusterList from "./credentials/ClusterList";
import { useLocation, useParams } from "react-router";
import qs from "qs";
import AzureCredentialsList from "./credentials/AzureCredentialList";

type Props = {};

type ProvisionParams = {
  name: string;
};

type ProvisionQueryParams = {
  version?: string;
};

const ProvisionInfra: React.FunctionComponent<Props> = () => {
  const { name } = useParams<ProvisionParams>();
  const location = useLocation<ProvisionQueryParams>();
  const version = getQueryParam({ location }, "version");
  const origin = getQueryParam({ location }, "origin");
  const { currentProject, setCurrentError } = useContext(Context);
  const [templates, setTemplates] = useState<InfraTemplateMeta[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<InfraTemplate>(null);
  const [selectedClusterID, setSelectedClusterID] = useState<number>(null);
  const [currentCredential, setCurrentCredential] = useState<InfraCredentials>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { pushFiltered } = useRouting();

  useEffect(() => {
    if (currentProject && !name) {
      api
        .listInfraTemplates(
          "<token>",
          {},
          {
            project_id: currentProject.id,
          }
        )
        .then(({ data }) => {
          if (!Array.isArray(data)) {
            throw Error("Data is not an array");
          }

          let templates = data.sort((a, b) =>
            a.name > b.name ? 1 : b.name > a.name ? -1 : 0
          );

          setTemplates(templates);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setHasError(true);
          setCurrentError(err.response?.data?.error);
          setIsLoading(false);
        });
    }
  }, [currentProject, name]);

  useEffect(() => {
    if (currentProject && name) {
      let templateVersion = version || "latest";

      setIsLoading(true);

      api
        .getInfraTemplate(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            version: templateVersion,
            name: name,
          }
        )
        .then(({ data }) => {
          setCurrentTemplate(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setHasError(true);
          setCurrentError(err.response?.data?.error);
          setIsLoading(false);
        });
    } else if (!name) {
      setCurrentTemplate(null);
    }
  }, [currentProject, name, version]);

  const onSubmit = (values: any) => {
    setIsLoading(true);

    api
      .provisionInfra(
        "<token>",
        {
          kind: currentTemplate.kind,
          values: values,
          aws_integration_id: currentCredential["aws_integration_id"],
          do_integration_id: currentCredential["do_integration_id"],
          gcp_integration_id: currentCredential["gcp_integration_id"],
          azure_integration_id: currentCredential["azure_integration_id"],
          cluster_id: selectedClusterID || null,
        },
        {
          project_id: currentProject.id,
        }
      )
      .then(({ data }) => {
        setIsLoading(false);

        if (origin) {
          pushFiltered(origin, ["project_id"]);
        } else if (data?.infra_id) {
          pushFiltered(`/infrastructure/${data?.infra_id}`, ["project_id"]);
        } else {
          pushFiltered(`/infrastructure`, ["project_id"]);
        }
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  const renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  const renderTemplates = () => {
    return templates.map((template) => {
      let { name, icon, description } = template;

      return (
        <TemplateBlock
          key={name}
          onClick={() =>
            pushFiltered(
              `/infrastructure/provision/${template.name}`,
              ["project_id"],
              {
                version: template.version,
              }
            )
          }
        >
          {renderIcon(icon)}
          <TemplateTitle>{name}</TemplateTitle>
          <TemplateDescription>{description}</TemplateDescription>
        </TemplateBlock>
      );
    });
  };

  const renderStepContents = () => {
    const numSteps = 2 + currentTemplate?.form?.isClusterScoped;

    //   // if credentials need to be set and the list doesn't contain the necessary creds,
    //   // render a credentials form
    if (
      currentTemplate.required_credential != "" &&
      currentCredential == null
    ) {
      if (currentTemplate.required_credential == "aws_integration_id") {
        return (
          <ActionContainer>
            <Heading>Step 1 of {numSteps} - Link AWS Credentials</Heading>
            <AWSCredentialsList
              selectCredential={(i) =>
                setCurrentCredential({
                  aws_integration_id: i,
                })
              }
            />
          </ActionContainer>
        );
      } else if (currentTemplate.required_credential == "gcp_integration_id") {
        return (
          <ActionContainer>
            <Heading>Step 1 of {numSteps} - Link GCP Credentials</Heading>
            <GCPCredentialsList
              selectCredential={(i) =>
                setCurrentCredential({
                  gcp_integration_id: i,
                })
              }
            />
          </ActionContainer>
        );
      } else if (currentTemplate.required_credential == "do_integration_id") {
        return (
          <ActionContainer>
            <Heading>Step 1 of {numSteps} - Link DO Credentials</Heading>
            <DOCredentialsList
              selectCredential={(i) =>
                setCurrentCredential({
                  do_integration_id: i,
                })
              }
            />
          </ActionContainer>
        );
      } else if (
        currentTemplate.required_credential == "azure_integration_id"
      ) {
        return (
          <ActionContainer>
            <Heading>Step 1 of {numSteps} - Link Azure Credentials</Heading>
            <AzureCredentialsList
              selectCredential={(i) =>
                setCurrentCredential({
                  azure_integration_id: i,
                })
              }
            />
          </ActionContainer>
        );
      }
    }

    if (currentTemplate?.form?.isClusterScoped && !selectedClusterID) {
      return (
        <ActionContainer>
          <Heading>Step 2 of {numSteps} - Select a Cluster</Heading>
          <ClusterList
            selectCluster={(cluster_id) => {
              setSelectedClusterID(cluster_id);
            }}
          />
        </ActionContainer>
      );
    }

    return (
      <ActionContainer>
        <Heading>
          Step {numSteps} of {numSteps} - Configure Settings
        </Heading>
        <FormContainer>
          <PorterFormWrapper
            showStateDebugger={false}
            formData={currentTemplate.form}
            valuesToOverride={{}}
            isReadOnly={false}
            onSubmit={onSubmit}
            isInModal={false}
            hideBottomSpacer={false}
            saveButtonText={"Provision"}
          />
        </FormContainer>
      </ActionContainer>
    );
  };

  const renderTitleSection = () => {
    if (currentTemplate) {
      return (
        <>
          <TitleSection>{`Provision ${currentTemplate.name}`}</TitleSection>
          <InfoSection>
            <Description>
              {`Input the required configuration settings.`}
            </Description>
          </InfoSection>
          <LineBreak />
        </>
      );
    }

    return (
      <>
        <TitleSection>Provision Infrastructure</TitleSection>
        <InfoSection>
          <Description>
            Select the infrastructure template you would like to use for
            provisioning.
          </Description>
        </InfoSection>
        <LineBreak />
      </>
    );
  };

  const renderContents = () => {
    if (currentTemplate) {
      let { name, icon, description } = currentTemplate;
      return (
        <ExpandedContainer>
          <BackArrowContainer>
            <BackArrow
              onClick={() =>
                pushFiltered(origin || `/infrastructure/provision`, [
                  "project_id",
                ])
              }
            >
              <i className="material-icons next-icon">navigate_before</i>
              {origin ? "Back" : "All Templates"}
            </BackArrow>
          </BackArrowContainer>
          <StepContainer>
            <TemplateMetadataContainer>
              {renderIcon(icon)}
              <TemplateTitle>{name}</TemplateTitle>
              <TemplateDescription>{description}</TemplateDescription>
            </TemplateMetadataContainer>
            {renderStepContents()}
          </StepContainer>
        </ExpandedContainer>
      );
    }

    return <TemplateList>{renderTemplates()}</TemplateList>;
  };

  return (
    <TemplatesWrapper>
      {renderTitleSection()}
      {renderContents()}
    </TemplatesWrapper>
  );
};

export default ProvisionInfra;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  margin: 10px 0px 35px;
`;

const Icon = styled.img`
  height: 42px;
  margin-top: 35px;
  margin-bottom: 13px;
`;

const Polymer = styled.div`
  > i {
    font-size: 34px;
    margin-top: 38px;
    margin-bottom: 20px;
  }
`;

const TemplateDescription = styled.div`
  margin-bottom: 26px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TemplateTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  border: 1px solid #ffffff00;
  align-items: center;
  user-select: none;
  border-radius: 8px;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 200px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 4px 15px 0px #00000044;
  :hover {
    background: #ffffff11;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TemplateList = styled.div`
  overflow: visible;
  margin-top: 35px;
  padding-bottom: 150px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const TemplatesWrapper = styled.div`
  position: relative;
  min-width: 300px;
  margin: 0 auto;
`;

const StyledTitleSection = styled(TitleSection)`
  display: flex;
  align-items: center;
  width: 50%;
`;

const StepContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const TemplateMetadataContainer = styled.div`
  min-width: 300px;
  width: 27%;
  height: 200px;
  border: 1px solid #ffffff00;
  align-items: center;
  user-select: none;
  border-radius: 8px;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 4px 15px 0px #00000044;
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ActionContainer = styled.div`
  min-width: 500px;
  width: 70%;
  min-height: 600px;
  border: 1px solid #ffffff00;
  align-items: center;
  user-select: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  padding: 3px 0px 5px;
  color: #ffffff;
  position: relative;
  background: #2e3135;
  margin-left: 20px;
  padding: 0 40px;

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const BackArrowContainer = styled.div`
  width: 100%;
  height: 24px;
`;

const BackArrow = styled.div`
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 6px;
  }

  color: #aaaabb;
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  width: 120px;
`;

const ExpandedContainer = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const FormContainer = styled.div`
  position: relative;
  margin: 20px 0;
`;

const InfoSection = styled.div`
  margin-top: 36px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;
