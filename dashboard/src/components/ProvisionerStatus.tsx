import { Steps } from "main/home/onboarding/types";
import React, { useState } from "react";
import { integrationList } from "shared/common";

import loading from "assets/loading.gif";

import styled from "styled-components";

type Props = {
  modules: TFModule[];
};

export interface TFModule {
  id: number
  kind: string
  status: string
  created_at: string
  global_errors?: TFResourceError[]
  // optional resources, if not created
  resources?: TFResource[]
}

export interface TFResourceError {
  errored_out: boolean
  error_context?: string
}

export interface TFResource {
  addr: string,
  provisioned: boolean,
  errored: TFResourceError,
}

const nameMap: { [key: string]: string } = {
  eks: "Elastic Kubernetes Service (EKS)",
  ecr: "Elastic Container Registry (ECR)",
  doks: "DigitalOcean Kubernetes Service (DOKS)",
  docr: "DigitalOcean Container Registry (DOCR)",
  gke: "Google Kubernetes Engine (GKE)",
  gcr: "Google Container Registry (GCR)",
};

const ProvisionerStatus: React.FC<Props> = ({ modules }) => {
  const renderStatus = (status: string) => {
    if (status === "successful") {
      return (
        <StatusIcon successful={true}>
          <i className="material-icons">done</i>
        </StatusIcon>
      );
    } else if (status === "loading") {
      return (
        <StatusIcon>
          <LoadingGif src={loading} />
        </StatusIcon>
      );
    } else if (status === "error") {
      return (
        <StatusIcon>
          <i className="material-icons">error_outline</i>
        </StatusIcon>
      );
    }
  };

  const renderModules = () => {
    return modules.map(val => {
      const totalResources = val.resources?.length;
      const provisionedResources = val.resources?.filter((resource) => {
        return resource.provisioned;
      }).length;

      let errors: string[] = [];

      if (val.status == "destroyed") {
        errors.push("Note: this infrastructure was automatically destroyed.")
      }

      let hasError = val.resources?.filter((resource) => {
        if (resource.errored?.errored_out) {
          errors.push(resource.errored?.error_context)
        }

        return resource.errored?.errored_out
      }).length > 0

      if (val.global_errors) {
        for (let globalErr of val.global_errors) {
          errors.push("Global error: " + globalErr.error_context)
          hasError = true
        }
      }

      const width = 100 * (provisionedResources / (totalResources * 1.0)) || 0

      let error = null;

      if (hasError) {
        error = errors.map((error, index) => {
          return <ExpandedError key={index}>{error}</ExpandedError>
        })
      } 
      let loadingFill;
      let status;

      if (hasError || val.status == "destroyed") {
        loadingFill = <LoadingFill status="error" width={width + "%"} />
        status = renderStatus("error")
      } else if (width == 100) {
        loadingFill = <LoadingFill status="successful" width={width + "%"} />;
        status = renderStatus("successful");
      } else {
        loadingFill = <LoadingFill status="loading" width={width + "%"} />;
        status = renderStatus("loading");
      }

      return (
        <InfraObject key={val.id}>
          <InfraHeader>
            {status}
            {
              integrationList[val.kind] && <Icon src={integrationList[val.kind].icon} />
            }
            {nameMap[val.kind]}
          </InfraHeader>
          <LoadingBar>{loadingFill}</LoadingBar>
          <ErrorWrapper>
            {error}
          </ErrorWrapper>
        </InfraObject>
      );
    });
  };

  return (
    <StyledProvisionerStatus>
      {renderModules()}
    </StyledProvisionerStatus>
  );
};

export default ProvisionerStatus;

const Icon = styled.img`
  height: 20px;
  margin-right: 10px;
`;

const ErrorWrapper = styled.div`
  max-height: 150px;
  margin-top: 20px;
  overflow-y: auto;
  user-select: text;
  padding: 0 15px;
`;

const ExpandedError = styled.div`
  background: #ffffff22;
  border-radius: 5px;
  padding: 15px;
  font-size: 13px;
  font-family: monospace;
  border: 1px solid #aaaabb;
  margin-bottom: 17px;
  padding-bottom: 17px;
`;

const LoadingFill = styled.div<{ width: string; status: string }>`
  width: ${(props) => props.width};
  background: ${(props) =>
    props.status === "successful"
      ? "rgb(56, 168, 138)"
      : props.status === "error"
      ? "#fcba03"
      : "linear-gradient(to right, #8ce1ff, #616FEE)"};
  height: 100%;
  background-size: 250% 100%;
  animation: moving-gradient 2s infinite;
  animation-timing-function: ease-in-out;
  animation-direction: alternate;

  @keyframes moving-gradient {
    0% {
        background-position: left bottom;
    }

    100% {
        background-position: right bottom;
    }
  }​
`;

const StatusIcon = styled.div<{ successful?: boolean }>`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;

  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${(props) => (props.successful ? "rgb(56, 168, 138)" : "#fcba03")};
  }
`;

const LoadingGif = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 9px;
  margin-bottom: 0px;
`;

const StyledProvisionerStatus = styled.div`
  margin-top: 25px;
`;

const LoadingBar = styled.div`
  width: calc(100% - 30px);
  background: #ffffff22;
  border: 100px;
  margin: 15px 15px 0;
  height: 18px;
  overflow: hidden;
  border-radius: 100px;
`;

const InfraObject = styled.div`
  background: #ffffff22;
  padding: 15px 0 0;
  border: 1px solid #aaaabb;
  border-radius: 5px;
  margin-bottom: 10px;
`;

const InfraHeader = styled.div`
  font-size: 13px;
  font-weight: 500;
  padding: 0 15px;
  display: flex;
  align-items: center;
`;
