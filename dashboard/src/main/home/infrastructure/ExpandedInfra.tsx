import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import TitleSection from "components/TitleSection";
import pr_icon from "assets/pull_request_icon.svg";
import { useRouteMatch, useLocation } from "react-router";
import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import { Context } from "shared/Context";
import api from "shared/api";
import github from "assets/github-white.png";
import { integrationList } from "shared/common";
import TabSelector from "components/TabSelector";
import yaml from "js-yaml";

import { Infrastructure, KindMap } from "./InfrastructureList";
import DeployList from "./components/DeployList";
import { curry } from "lodash";
import InfraResourceList from "./components/InfraResourceList";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";

export const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
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

type Props = {
  infra_id: number;
};

const ExpandedInfra: React.FunctionComponent<Props> = ({ infra_id }) => {
  const { params } = useRouteMatch<{ namespace: string }>();
  const context = useContext(Context);
  const [infra, setInfra] = useState<Infrastructure>(null);
  const [currentTab, setCurrentTab] = useState("deploys");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRepoTooltip, setShowRepoTooltip] = useState(false);

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const { search } = useLocation();
  let searchParams = new URLSearchParams(search);

  useEffect(() => {
    if (!currentProject) {
      return;
    }
    let isSubscribed = true;

    api
      .getInfraByID(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra_id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        setInfra(data);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
        }
      });
  }, [currentProject, infra_id]);

  if (!infra) {
    return <Loading />;
  }

  const renderTabContents = (newTab: string) => {
    if (newTab === "deploys") {
      return <DeployList infra_id={infra_id} />;
    } else if (newTab === "resources") {
      return <InfraResourceList infra_id={infra_id} />;
    }
  };

  const formData = yaml.load(initYaml);

  return (
    <StyledExpandedChart>
      <HeaderWrapper>
        <BackButton to={"/infrastructure"}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <Title icon={integrationList[infra.kind].icon} iconWidth="25px">
          {integrationList[infra.kind].label}
          <Flex>
            <ResourceLink
              to={KindMap[infra.kind].resource_link}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              {KindMap[infra.kind].resource_name}
              <i className="material-icons">open_in_new</i>
            </ResourceLink>
          </Flex>
        </Title>

        <InfoWrapper>
          <InfoText>
            Last updated {readableDate(infra.latest_operation?.last_updated)}
          </InfoText>
        </InfoWrapper>
      </HeaderWrapper>
      <PorterFormWrapper
        showStateDebugger={false}
        formData={formData}
        valuesToOverride={{}}
        isReadOnly={false}
        onSubmit={(vars) => {
          console.log(vars);
        }}
        leftTabOptions={[
          {
            value: "deploys",
            label: "Deploys",
          },
          {
            value: "resources",
            label: "Resources",
          },
        ]}
        rightTabOptions={[
          {
            value: "settings",
            label: "Settings",
          },
        ]}
        renderTabContents={renderTabContents}
        saveButtonText={"Test Submit"}
      />
      {/* <TabSelector
        currentTab={currentTab}
        options={[
          {
            value: "deploys",
            label: "Deploys",
          },
          {
            value: "resources",
            label: "Resources",
          },
          {
            value: "settings",
            label: "Settings",
          },
        ]}
        setCurrentTab={setCurrentTab}
      />
      {renderTabContents()} */}
    </StyledExpandedChart>
  );
};

export default ExpandedInfra;

const Flex = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0;
`;

const GHALink = styled(DynamicLink)`
  font-size: 13px;
  font-weight: 400;
  margin-left: 7px;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    text-decoration: underline;
    color: white;
  }

  > img {
    height: 16px;
    margin-right: 9px;
    margin-left: 5px;

    :text-decoration: none;
    :hover {
      text-decoration: underline;
      color: white;
    }
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin-top: 20px;
  margin-bottom: 20px;
`;

const BackButton = styled(DynamicLink)`
  position: absolute;
  top: 0px;
  right: 0px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;

const HeaderWrapper = styled.div`
  position: relative;
  margin-bottom: 10px;
`;

const Dot = styled.div`
  margin-left: 9px;
  font-size: 14px;
  color: #ffffff33;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  width: auto;
  justify-content: space-between;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  margin-left: 20px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const Icon = styled.img`
  width: 100%;
`;

const StyledExpandedChart = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Title = styled(TitleSection)`
  font-size: 16px;
  margin-top: 4px;
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  margin-left: 1px;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "created"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 15px;
`;

const PRLink = styled(DynamicLink)`
  margin-left: 0px;
  display: flex;
  margin-top: 1px;
  align-items: center;
  font-size: 13px;
  > i {
    font-size: 15px;
    margin-right: 10px;
  }
`;

const ChartListWrapper = styled.div`
  width: 100%;
  margin: auto;
  margin-top: 20px;
  padding-bottom: 125px;
`;

const LinkToActionsWrapper = styled.div`
  width: 100%;
  margin-top: 15px;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  margin-left: 15px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 5px;
`;

const DeploymentTypeIcon = styled(Icon)`
  width: 20px;
  margin-right: 10px;
`;

const RepositoryName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 390px;
  position: relative;
  margin-right: 3px;
`;

const Tooltip = styled.div`
  position: absolute;
  left: -40px;
  top: 28px;
  min-height: 18px;
  max-width: calc(700px);
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  color: white;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ResourceLink = styled(DynamicLink)`
  font-size: 13px;
  font-weight: 400;
  margin-left: 20px;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    text-decoration: underline;
    color: white;
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
`;

const InfoText = styled.span`
  font-size: 13px;
  color: #aaaabb66;
`;

const initYaml = `name: Web
hasSource: true
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: String to echo
    - type: string-input
      variable: echo
      value: 
      - "hello"
`;
