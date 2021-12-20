import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import TitleSection from "components/TitleSection";
import pr_icon from "assets/pull_request_icon.svg";
import { useRouteMatch } from "react-router";
import DynamicLink from "components/DynamicLink";
import { capitalize, PRDeployment } from "./EnvironmentList";
import Loading from "components/Loading";
import { Context } from "shared/Context";
import api from "shared/api";
import ChartList from "../../chart/ChartList";
import github from "assets/github-white.png";

const mockEnvironment = {
  id: 1,
  environment_id: 1,
  namespace: "pr-30",
  pull_request_id: 30,
  subdomain: "https://porter.run",
  status: "deployed",
};

const getMockData = () =>
  new Promise<{ data: PRDeployment }>((resolve) => {
    setTimeout(() => {
      resolve({ data: mockEnvironment });
      // resolve({ data: [] });
    }, 2000);
  });

const EnvironmentDetail = () => {
  const { params } = useRouteMatch<{ namespace: string }>();
  const context = useContext(Context);
  const [environment, setEnvironment] = useState<PRDeployment>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  useEffect(() => {
    let isSubscribed = true;

    api
    .getPRDeployment(
      "<token>",
      {
        namespace: params.namespace
      },
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      }
    ).then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        console.log('retrieved', data)
        setEnvironment(data);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
          setEnvironment(null);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

      return () => {
        isSubscribed = false;
      };  
  }, [params]);

  if (!environment) {
    return <Loading />;
  }

  return (
    <StyledExpandedChart>
      <HeaderWrapper>
        <BackButton to={"/cluster-dashboard?selected_tab=preview_environments"}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <Title icon={pr_icon} iconWidth="25px">
          {environment.subdomain}
          <TagWrapper>
            Namespace <NamespaceTag>{environment.namespace}</NamespaceTag>
          </TagWrapper>
        </Title>
        <InfoWrapper>
          {
            environment.subdomain && <PRLink to={environment.subdomain} target="_blank">
            <i className="material-icons">link</i>
            {environment.subdomain}
          </PRLink>

          }
        </InfoWrapper>
        <Flex>
          <Status>
            <StatusDot status={environment.status} />
            {capitalize(environment.status)}
          </Status>
          <Dot>•</Dot>
          <GHALink to={'https://github.com/actions'} target="_blank">
            <img src={github} /> GitHub
            <i className="material-icons">open_in_new</i>
          </GHALink>
        </Flex>
        <LinkToActionsWrapper></LinkToActionsWrapper>
      </HeaderWrapper>
      <LineBreak />
      <ChartListWrapper>
        <ChartList
          currentCluster={context.currentCluster}
          currentView="cluster-dashboard"
          sortType="Newest"
          namespace={environment.namespace}
          disableBottomPadding
        />
      </ChartListWrapper>
    </StyledExpandedChart>
  );
};

export default EnvironmentDetail;

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
