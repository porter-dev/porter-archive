import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "shared/api";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { OFState } from "../state";
import github from "assets/github.png";
import { connectSourceTracks } from "shared/anayltics";
import DocsHelper from "components/DocsHelper";

interface GithubAppAccessData {
  username?: string;
  accounts?: string[];
}

/**
 * First step of the flow showing simple Connect to github button, this should
 * redirect to the github flow
 *
 * That way we can be sure that the we have full credentials to launch apps from the user repos.
 *
 * The other option would be skip integration, that will skip the whole github connection flow.
 */
const ConnectSource: React.FC<{
  onSuccess: (data: any) => void;
}> = ({ onSuccess }) => {
  const [accountData, setAccountData] = useState<GithubAppAccessData>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getGithubAccounts("<token>", {}, {});
      if (res.status !== 200) {
        throw new Error("Not authorized");
      }
      return res.data;
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    getAccounts().then((accountsData) => {
      if (isSubscribed) {
        if (!accountsData) {
          setAccountData(null);
        } else {
          setAccountData(accountsData);
        }
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, []);

  const nextStep = (selectedSource: "docker" | "github") => {
    if (selectedSource === "docker") {
      connectSourceTracks.trackUseDockerRegistryClicked();
    } else {
      connectSourceTracks.trackContinueAfterGithubConnect();
    }
    onSuccess(selectedSource);
  };

  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

  const encoded_redirect_uri = encodeURIComponent(url);

  return (
    <div>
      <TitleSection>Getting started</TitleSection>
      <Subtitle>
        Step 1 of 3 - Connect to GitHub
        <DocsHelper
          tooltipText="Porter uses a GitHub App to authorize and gain access to your GitHub repositories. In order to be able to deploy applications through GitHub repositories, you must first authorize the Porter GitHub App to have access to them."
          link={
            "https://docs.porter.run/getting-started/linking-application-source#connecting-to-github"
          }
        />
      </Subtitle>
      <Helper>
        To deploy applications from your repo, you need to connect a Github
        account.
      </Helper>
      {!isLoading && (!accountData || !accountData?.accounts?.length) && (
        <>
          <ConnectToGithubButton
            href={`/api/integrations/github-app/install?redirect_uri=${encoded_redirect_uri}`}
            onClick={() => {
              connectSourceTracks.trackConnectGithubButtonClicked();
              // Will allow the anchor tag to redirect properly
              return true;
            }}
          >
            <GitHubIcon src={github} /> Connect to GitHub
          </ConnectToGithubButton>
          <Helper>
            No thanks, I want to deploy from a
            <A onClick={() => nextStep("docker")}>Docker registry</A>.
          </Helper>
        </>
      )}
      {!isLoading && accountData?.accounts?.length && (
        <>
          <Helper>Porter currently has access to:</Helper>
          <List>
            {accountData?.accounts.length > 0 ? (
              accountData?.accounts.map((name, i) => {
                return (
                  <Row
                    key={i}
                    isLastItem={i === accountData.accounts.length - 1}
                  >
                    <i className="material-icons">bookmark</i>
                    {name}
                  </Row>
                );
              })
            ) : (
              <Placeholder>No repositories found.</Placeholder>
            )}
          </List>
          <Helper>
            Don't see the right repos?{" "}
            <A
              href={`/api/integrations/github-app/install?redirect_uri=${encoded_redirect_uri}`}
              onClick={() => {
                connectSourceTracks.trackInstallOnMoreRepositoriesClicked();
                // Will allow the anchor tag to redirect properly
                return true;
              }}
            >
              Install Porter in more repositories
            </A>
            .
          </Helper>
          <NextStep
            text="Continue"
            disabled={false}
            onClick={() => nextStep("github")}
            status={""}
            makeFlush={true}
            clearPosition={true}
            statusPosition="right"
            saveText=""
            successText="Project created successfully!"
          />
        </>
      )}
    </div>
  );
};

export default ConnectSource;

const Placeholder = styled.div`
  width: 100%;
  height: 80px;
  color: #aaaabb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
`;

const FadeWrapper = styled.div<{ delay?: string }>`
  opacity: 0;
  animation: fadeIn 0.5s ${(props) => props.delay || "0.2s"};
  animation-fill-mode: forwards;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const SlideWrapper = styled.div<{ delay?: string }>`
  opacity: 0;
  animation: slideIn 0.7s ${(props) => props.delay || "1.3s"};
  animation-fill-mode: forwards;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const GitHubIcon = styled.img`
  width: 20px;
  filter: brightness(150%);
  margin-right: 10px;
`;

const NextStep = styled(SaveButton)`
  margin-top: 24px;
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;

const List = styled.div`
  width: 100%;
  background: #ffffff11;
  border-radius: 5px;
  margin-top: 20px;
  border: 1px solid #aaaabb;
  max-height: 200px;
  overflow-y: auto;
`;

const Row = styled.div<{ isLastItem?: boolean }>`
  width: 100%;
  height: 35px;
  color: #ffffff55;
  font-size: 13px;
  display: flex;
  align-items: center;
  border-bottom: ${(props) => (props.isLastItem ? "" : "1px solid #ffffff44")};
  > i {
    font-size: 17px;
    margin-left: 10px;
    margin-right: 12px;
    color: #ffffff44;
  }
`;

const Subtitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin-top: 16px;
  display: flex;
  align-items; center;
  > a {
    > i {
      font-size: 18px;
      margin-left: 10px;
      margin-top: 1px;
      color: #8590ff;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const ConnectToGithubButton = styled.a`
  width: 180px;
  justify-content: center;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  color: white;
  font-weight: 500;
  padding: 10px;
  overflow: hidden;
  white-space: nowrap;
  margin-top: 25px;
  margin-bottom: 25px;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#2E3338"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#353a3e"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
