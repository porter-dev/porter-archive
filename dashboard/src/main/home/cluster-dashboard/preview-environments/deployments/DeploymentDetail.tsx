import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import TitleSection from "components/TitleSection";
import pr_icon from "assets/pull_request_icon.svg";
import { useRouteMatch, useLocation } from "react-router";
import DynamicLink from "components/DynamicLink";
import { PRDeployment } from "../types";
import Loading from "components/Loading";
import { Context } from "shared/Context";
import api from "shared/api";
import ChartList from "../../chart/ChartList";
import github from "assets/github-white.png";
import { integrationList } from "shared/common";
import { capitalize } from "shared/string_utils";
import leftArrow from "assets/left-arrow.svg";

const DeploymentDetail = () => {
  const { params } = useRouteMatch<{ namespace: string }>();
  const context = useContext(Context);
  const [prDeployment, setPRDeployment] = useState<PRDeployment>(null);
  const [environmentId, setEnvironmentId] = useState("");
  const [showRepoTooltip, setShowRepoTooltip] = useState(false);

  const { currentProject, currentCluster } = useContext(Context);

  const { search } = useLocation();
  let searchParams = new URLSearchParams(search);

  useEffect(() => {
    let isSubscribed = true;
    let environment_id = parseInt(searchParams.get("environment_id"));
    setEnvironmentId(searchParams.get("environment_id"));
    api
      .getPRDeploymentByEnvironment(
        "<token>",
        {
          namespace: params.namespace,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: environment_id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        setPRDeployment(data);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setPRDeployment(null);
        }
      });
  }, [params]);

  if (!prDeployment) {
    return <Loading />;
  }

  let repository = `${prDeployment.gh_repo_owner}/${prDeployment.gh_repo_name}`;

  return (
    <StyledExpandedChart>
      <BreadcrumbRow>
        <Breadcrumb
          to={`/preview-environments/deployments/${environmentId}/${repository}`}
        >
          <ArrowIcon src={leftArrow} />
          <Wrap>Back</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <HeaderWrapper>
        <Title icon={pr_icon} iconWidth="25px">
          {prDeployment.gh_pr_name}
        </Title>
        <InfoWrapper>
          {prDeployment.subdomain && (
            <PRLink to={prDeployment.subdomain} target="_blank">
              <i className="material-icons">link</i>
              {prDeployment.subdomain}
            </PRLink>
          )}
          <TagWrapper>
            Namespace <NamespaceTag>{params.namespace}</NamespaceTag>
          </TagWrapper>
        </InfoWrapper>
        <Flex>
          <Status>
            <StatusDot status={prDeployment.status} />
            {capitalize(prDeployment.status)}
          </Status>
          <Dot>•</Dot>
          <DeploymentImageContainer>
            <DeploymentTypeIcon src={integrationList.repo.icon} />
            <RepositoryName
              onMouseOver={() => {
                setShowRepoTooltip(true);
              }}
              onMouseOut={() => {
                setShowRepoTooltip(false);
              }}
            >
              {repository}
            </RepositoryName>
            {showRepoTooltip && <Tooltip>{repository}</Tooltip>}
          </DeploymentImageContainer>
          <Dot>•</Dot>
          <GHALink
            to={`https://github.com/${repository}/pull/${prDeployment.pull_request_id}`}
            target="_blank"
          >
            <img src={github} /> GitHub PR
            <i className="material-icons">open_in_new</i>
          </GHALink>
          {prDeployment.last_workflow_run_url ? (
            <GHALink to={prDeployment.last_workflow_run_url} target="_blank">
              <span className="material-icons-outlined">
                play_circle_outline
              </span>
              Last workflow run
              <i className="material-icons">open_in_new</i>
            </GHALink>
          ) : null}
        </Flex>
        <LinkToActionsWrapper></LinkToActionsWrapper>
      </HeaderWrapper>
      <ChartListWrapper>
        <ChartList
          currentCluster={context.currentCluster}
          currentView="cluster-dashboard"
          sortType="Newest"
          namespace={params.namespace}
          disableBottomPadding
          closeChartRedirectUrl={`${window.location.pathname}${window.location.search}`}
        />
      </ChartListWrapper>
    </StyledExpandedChart>
  );
};

export default DeploymentDetail;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
`;

const Breadcrumb = styled(DynamicLink)`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const Wrap = styled.div`
  z-index: 999;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
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

    text-decoration: none;

    :hover {
      text-decoration: underline;
      color: white;
    }
  }

  > span {
    font-size: 17px;
    margin-right: 9px;
    margin-left: 5px;
    text-decoration: none;
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
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
  padding-right: 40px;
`;

const Dot = styled.div`
  margin-left: 9px;
  font-size: 14px;
  color: #ffffff33;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
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
  margin-left: 5px;
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
