import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import TitleSection from "components/TitleSection";
import pr_icon from "assets/pull_request_icon.svg";
import { useRouteMatch } from "react-router";
import DynamicLink from "components/DynamicLink";
import { capitalize, Environment } from "./EnvironmentList";
import { Context } from "shared/Context";
import api from "shared/api";
import ChartList from "../../chart/ChartList";

const mockEnvironment = {
  id: 1,
  url: "https://porter.run",
  pr_link: "https://githubsuperpullrequest.com",
  status: "deployed",
  namespace: "default",
  actions_link: "https://githubsuperactions.com",
};

const getMockData = () =>
  new Promise<{ data: Environment }>((resolve) => {
    setTimeout(() => {
      resolve({ data: mockEnvironment });
      // resolve({ data: [] });
    }, 2000);
  });

const EnvironmentDetail = () => {
  const { params } = useRouteMatch<{ repoId: string }>();
  const context = useContext(Context);
  const [environment, setEnvironment] = useState<Environment>(null);

  useEffect(() => {
    // TODO: FETCH REPO OR PR?
    console.log(params.repoId);

    getMockData().then((res) => {
      setEnvironment(res.data);
    });
  }, [params]);

  if (!environment) {
    return <>Loading . . .</>;
  }

  return (
    <StyledExpandedChart>
      <HeaderWrapper>
        <BackButton to={"/cluster-dashboard?selected_tab=preview_environments"}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <Title icon={pr_icon} iconWidth="30px">
          {environment.url}
          <DynamicLink to={environment.url} target="_blank">
            <i className="material-icons">link</i>
          </DynamicLink>
          <TagWrapper>
            Namespace <NamespaceTag>{environment.namespace}</NamespaceTag>
          </TagWrapper>
        </Title>
        <br />
        <InfoWrapper>
          <PrLinkWrapper>
            Link to PR:
            <PRLink to={environment.pr_link} target="_blank">
              {environment.pr_link}
            </PRLink>
          </PrLinkWrapper>
          <Status>
            <StatusDot status={environment.status} />
            {capitalize(environment.status)}
          </Status>
        </InfoWrapper>
      </HeaderWrapper>
      <br />
      <ChartListWrapper>
        <ChartList
          currentCluster={context.currentCluster}
          currentView="cluster-dashboard"
          sortType="Newest"
          namespace={environment.namespace}
          disableBottomPadding
        />
      </ChartListWrapper>
      <LinkToActionsWrapper>
        <DynamicLink to={environment.actions_link}>
          Link to Actions tab
        </DynamicLink>
      </LinkToActionsWrapper>
    </StyledExpandedChart>
  );
};

export default EnvironmentDetail;

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
  margin-right: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 22px;
  width: auto;
  justify-content: space-between;
`;

const PrLinkWrapper = styled.div`
  font-size: 14px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  margin-left: 15px;
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
  overflow: hidden;
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
`;

const Status = styled.span`
  font-size: 14px;
  display: flex;
  align-items: center;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "deployed"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 5px;
`;

const PRLink = styled(DynamicLink)`
  margin-left: 5px;
`;

const ChartListWrapper = styled.div`
  width: 95%;
  margin: auto;
  margin-top: 20px;
`;

const LinkToActionsWrapper = styled.div`
  width: 100%;
  margin-top: 15px;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
