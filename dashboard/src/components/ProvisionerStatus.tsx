import { Steps } from "main/home/onboarding/types";
import React, { useState } from "react";
import { integrationList } from "shared/common";

import loading from "assets/loading.gif";

import styled, { keyframes } from "styled-components";

type Props = {
  modules: TFModule[];
  onDelete?: (infraId: number) => void;
  onRetry?: (infraId: number) => void;
};

export interface TFModule {
  id: number;
  kind: string;
  status: string;
  created_at: string;
  updated_at: string;
  global_errors?: TFResourceError[];
  got_desired: boolean;
  // optional resources, if not created
  resources?: TFResource[];
}

export interface TFResourceError {
  errored_out?: boolean;
  error_context?: string;
}

export interface TFResource {
  addr: string;
  provisioned: boolean;
  destroyed?: boolean;
  destroying?: boolean;
  errored: TFResourceError;
}

const nameMap: { [key: string]: string } = {
  eks: "Elastic Kubernetes Service (EKS)",
  ecr: "Elastic Container Registry (ECR)",
  doks: "DigitalOcean Kubernetes Service (DOKS)",
  docr: "DigitalOcean Container Registry (DOCR)",
  gke: "Google Kubernetes Engine (GKE)",
  gcr: "Google Container Registry (GCR)",
};

const ProvisionerStatus: React.FC<Props> = ({ modules, onDelete, onRetry }) => {
  const renderStatus = (status: string) => {
    if (status === "successful") {
      return (
        <StatusIcon status={status}>
          <i className="material-icons">done</i>
        </StatusIcon>
      );
    } else if (status === "loading") {
      return (
        <StatusIcon status={status}>
          <LoadingGif src={loading} />
        </StatusIcon>
      );
    } else if (status === "error") {
      return (
        <StatusIcon status={status}>
          <i className="material-icons">error_outline</i>
        </StatusIcon>
      );
    } else if (status === "destroying") {
      return (
        <StatusIcon status={status}>
          <i className="material-icons-outlined">auto_delete</i>
        </StatusIcon>
      );
    } else if (status === "destroyed") {
      return (
        <StatusIcon status={status}>
          <i className="material-icons-outlined">delete</i>
        </StatusIcon>
      );
    }
  };

  const readableDate = (s: string) => {
    const ts = new Date(s);
    const date = ts.toLocaleDateString();
    const time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  const renderModules = () => {
    return modules.map((val) => {
      const totalResources = val.resources?.length;
      const provisionedResources = val.resources?.filter((resource) => {
        return resource.provisioned;
      }).length;

      let errors: string[] = [];

      if (val.status == "destroyed") {
        errors.push("Note: this infrastructure was destroyed.");
      }

      let hasError =
        val.resources?.filter((resource) => {
          if (resource.errored?.errored_out) {
            errors.push(resource.errored?.error_context);
          }

          return resource.errored?.errored_out;
        }).length > 0;

      if (val.global_errors) {
        for (let globalErr of val.global_errors) {
          errors.push(globalErr.error_context);
          hasError = true;
        }
      }

      if (val.status === "destroyed") {
        hasError = true;
      }

      // remove duplicate errors
      errors = errors.filter(
        (error, index, self) =>
          index ===
          self.findIndex((e) => {
            if (e && error) {
              return e === error || e.includes(error) || error.includes(e);
            }
          })
      );

      const width =
        val.status == "created"
          ? 100
          : 100 * (provisionedResources / (totalResources * 1.0)) || 0;

      let error = null;

      if (hasError) {
        error = errors.map((error, index) => {
          return <ExpandedError key={index}>{error}</ExpandedError>;
        });
      }

      const isDestroying = !!val.resources?.find((res) => res.destroying);

      let loadingFill;
      let status;

      if (val.status === "destroyed") {
        loadingFill = <LoadingFill status="destroyed" width={width + "%"} />;
        status = renderStatus("destroyed");
      } else if (isDestroying || val.status === "destroying") {
        loadingFill = <LoadingFill status="destroying" width={width + "%"} />;
        status = renderStatus("destroying");
      } else if (hasError) {
        loadingFill = <LoadingFill status="error" width={width + "%"} />;
        status = renderStatus("error");
      } else if (width == 100) {
        loadingFill = <LoadingFill status="successful" width={width + "%"} />;
        status = renderStatus("successful");
      } else {
        loadingFill = <LoadingFill status="loading" width={width + "%"} />;
        status = renderStatus("loading");
      }

      let showActions = false;
      let showDelete = false;
      let showRetry = false;

      if (typeof onDelete === "function") {
        showActions = true;
        showDelete = true;
      }

      if (typeof onRetry === "function") {
        showActions = true;
        showRetry = true;
      }

      return (
        <InfraObject key={val.id}>
          <InfraHeader>
            <Flex>
              {status}
              {integrationList[val.kind] && (
                <Icon src={integrationList[val.kind].icon} />
              )}
              {nameMap[val.kind]}
            </Flex>
            <Timestamp>Started {readableDate(val.created_at)}</Timestamp>
            {hasError && showActions && (
              <ActionContainer>
                {showRetry && (
                  <ActionButton onClick={() => onRetry(val.id)}>
                    <span className="material-icons">replay</span>
                  </ActionButton>
                )}
                {showDelete && (
                  <ActionButton onClick={() => onDelete(val.id)}>
                    <span className="material-icons">delete</span>
                  </ActionButton>
                )}
              </ActionContainer>
            )}
          </InfraHeader>
          <LoadingBar>{loadingFill}</LoadingBar>
          <ErrorWrapper>{error}</ErrorWrapper>
        </InfraObject>
      );
    });
  };

  return <StyledProvisionerStatus>{renderModules()}</StyledProvisionerStatus>;
};

export default ProvisionerStatus;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const Timestamp = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: #ffffff55;
`;

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

const movingGradient = keyframes`
  0% {
      background-position: left bottom;
  }

  100% {
      background-position: right bottom;
  }
`;

const LoadingFill = styled.div<{ width: string; status: string }>`
  width: ${(props) => props.width};
  background: ${(props) => {
    if (props.status === "successful") {
      return "rgb(56, 168, 138)";
    }

    if (props.status === "error") {
      return "#fcba03";
    }

    if (props.status === "destroying") {
      return "linear-gradient(to right, #ed5f85a4, #ed5f85)";
    }

    return "linear-gradient(to right, #8ce1ff, #616FEE)";
  }}

  height: 100%;
  background-size: 250% 100%;
  animation: ${movingGradient} 2s infinite;
  animation-timing-function: ease-in-out;
  animation-direction: alternate;
`;

const StatusIcon = styled.div<{
  status?: "loading" | "error" | "successful" | "destroying" | "destroyed";
}>`
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
    color: ${({ status }) => {
      if (status === "successful") {
        return "rgb(56, 168, 138)";
      }

      if (status === "destroying" || status === "destroyed") {
        return "#ed5f85";
      }

      return "#fcba03";
    }};
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
  position: relative;
`;

const InfraHeader = styled.div`
  font-size: 13px;
  font-weight: 500;
  justify-content: space-between;
  padding: 0 15px;
  display: flex;
  align-items: center;
  min-height: 35px;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  border: 1px;
  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
  min-width: 65px;
  justify-content: space-evenly;
`;
