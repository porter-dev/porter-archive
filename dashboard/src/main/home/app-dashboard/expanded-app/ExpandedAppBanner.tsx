import React, { useContext, useEffect } from "react";
import styled from "styled-components";
import PorterAppRevisionSection from "./PorterAppRevisionSection";
import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import GHABanner from "./GHABanner";
import { ChartType, CreateUpdatePorterAppOptions } from "shared/types";
import { Context } from "shared/Context";

type Props = {
    appData: any;
    hasBuiltImage: boolean;
    githubWorkflowFilename: string;
    setRevision: (chart: ChartType, isCurrent?: boolean) => void;
    updatePorterApp: (options: Partial<CreateUpdatePorterAppOptions>) => Promise<void>;
    userHasGithubAccess: boolean;
};

const ExpandedAppBanner: React.FC<Props> = ({
    appData,
    hasBuiltImage,
    githubWorkflowFilename,
    setRevision,
    updatePorterApp,
    userHasGithubAccess,
}) => {

    const { setCurrentModal } = useContext(Context);

    if (!hasBuiltImage && !userHasGithubAccess) {
        return (
            <>
                <DarkMatter />
                <PorterAppRevisionSection
                    chart={appData.chart}
                    setRevision={setRevision}
                    forceRefreshRevisions={false}
                    refreshRevisionsOff={() => ({})}
                    shouldUpdate={
                        appData.chart.latest_version &&
                        appData.chart.latest_version !==
                        appData.chart.chart.metadata.version
                    }
                    updatePorterApp={updatePorterApp}
                    latestVersion={appData.chart.latest_version}
                    appName={appData.app.name}
                />
                <Banner type="warning">
                    You do not have access to the GitHub repo associated with this application.
                    <Spacer inline width="5px" />
                    <Link
                        hasunderline
                        onClick={() => setCurrentModal?.("AccountSettingsModal", {})}
                    >
                        Check account settings
                    </Link>
                </Banner>
            </>
        )
    } else {
        return hasBuiltImage ? (
            <>
                <DarkMatter />
                <PorterAppRevisionSection
                    chart={appData.chart}
                    setRevision={setRevision}
                    forceRefreshRevisions={false}
                    refreshRevisionsOff={() => ({})}
                    shouldUpdate={
                        appData.chart.latest_version &&
                        appData.chart.latest_version !==
                        appData.chart.chart.metadata.version
                    }
                    updatePorterApp={updatePorterApp}
                    latestVersion={appData.chart.latest_version}
                    appName={appData.app.name}
                />
                <DarkMatter antiHeight="-18px" />
            </>
        )
            :
            githubWorkflowFilename ? (
                <Banner>
                    Your GitHub repo has not been built yet.
                    <Spacer inline width="5px" />
                    <Link
                        hasunderline
                        target="_blank"
                        to={`https://github.com/${appData.app.repo_name}/actions`}
                    >
                        Check status
                    </Link>
                </Banner>
            ) : (
                <GHABanner
                    repoName={appData.app.repo_name}
                    branchName={appData.app.git_branch}
                    pullRequestUrl={appData.app.pull_request_url}
                    stackName={appData.app.name}
                    gitRepoId={appData.app.git_repo_id}
                    porterYamlPath={appData.app.porter_yaml_path}
                />
            );
    }
};

export default ExpandedAppBanner;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-20px"};
`;