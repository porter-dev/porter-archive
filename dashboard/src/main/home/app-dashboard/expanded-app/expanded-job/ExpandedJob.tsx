import React, { useEffect, useState, useContext, useCallback } from "react";
import { RouteComponentProps, useLocation, withRouter } from "react-router";
import styled from "styled-components";

import history from "assets/history.png";
import loadingImg from "assets/loading.gif";
import refresh from "assets/refresh.png";

import api from "shared/api";
import { Context } from "shared/Context";
import Error from "components/porter/Error";

import Banner from "components/porter/Banner";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Back from "components/porter/Back";
import TabSelector from "components/TabSelector";
import RevisionSection from "main/home/cluster-dashboard/expanded-chart/RevisionSection";
import ConfirmOverlay from "components/porter/ConfirmOverlay";
import Fieldset from "components/porter/Fieldset";
import JobRuns from "../JobRuns";
import ExpandedJobRun from "./ExpandedJobRun";

type Props = RouteComponentProps & {
  appName: string;
  jobName: string;
  goBack: () => void;
};

const ExpandedJob: React.FC<Props> = ({ 
  appName,
  jobName,
  goBack,
  ...props 
}) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRun, setExpandedRun] = useState(null);

  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && expandedRun && (
        <ExpandedJobRun
          currentChart={null}
          jobRun={expandedRun}
          onClose={() => setExpandedRun(null)}
        />
      )}
      {!isLoading && !expandedRun && (
        <StyledExpandedApp>
          <Back onClick={goBack} />
          <Container row>
            <Icon src={history} />
            <Text size={21}>Run history for "{jobName}"</Text>
          </Container>
          <Spacer y={0.5} />
          <Text color="#aaaabb66">
            This job runs under the "{appName}" app.
          </Text>
          <Spacer y={1} />
          {currentCluster?.id && currentProject?.id && (
            <JobRuns
              lastRunStatus="all"
              namespace={`porter-stack-${appName}`}
              sortType="Newest"
              jobName={jobName}
              setExpandedRun={(x: any) => setExpandedRun(x)}
            />
          )}
        </StyledExpandedApp>
      )}
    </>
  );
};

export default withRouter(ExpandedJob);

const RefreshButton = styled.div`
  color: #ffffff44;
  display: flex;
  align-items: center;
  cursor: pointer;
  :hover {
    color: #ffffff;
    > img {
      opacity: 1;
    }
  }

  > img {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 11px;
    margin-right: 10px;
    opacity: 0.3;
  }
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-20px"};
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 6px;
`;

const BranchTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #ffffff22;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BranchSection = styled.div`
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  height: ${(props) => props.height || "15px"};
  opacity: ${(props) => props.opacity || 1};
  margin-right: 10px;
`;

const BranchIcon = styled.img`
  height: 14px;
  opacity: 0.65;
  margin-right: 5px;
`;

const Icon = styled.img`
  height: 24px;
  margin-right: 15px;
`;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;

const StyledExpandedApp = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const HeaderWrapper = styled.div`
  position: relative;
`;
const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 8px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;
const Dot = styled.div`
  margin-right: 16px;
`;
const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 3px;
  margin-top: 22px;
`;
