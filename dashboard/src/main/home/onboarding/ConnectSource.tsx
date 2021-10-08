import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "shared/api";
import { useRouting } from "shared/routing";
import styled from "styled-components";

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
const ConnectSource = () => {
  const [accountData, setAccountData] = useState<GithubAppAccessData>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { pushFiltered } = useRouting();

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

  const nextStep = () => {
    pushFiltered("/onboarding/registry", []);
  };

  return (
    <>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 1 of 2</Subtitle>
      <Helper>
        To deploy applications from your repo, you need to connect a Github
        account
      </Helper>
      {!isLoading && (!accountData || !accountData?.accounts?.length) && (
        <>
          <ConnectToGithubButton href="/api/integrations/github-app/oauth">
            Connect to github
          </ConnectToGithubButton>
          <Helper>
            No thanks, I want to deploy from a{" "}
            <A onClick={nextStep}>Docker registry</A>
          </Helper>
        </>
      )}
      {!isLoading && accountData?.accounts.length && (
        <>
          <List>
            {accountData?.accounts.map((name, i) => {
              return (
                <Row key={i} isLastItem={i === accountData.accounts.length - 1}>
                  <i className="material-icons">bookmark</i>
                  {name}
                </Row>
              );
            })}
          </List>
          <br />
          Don't see the right repos?{" "}
          <A href={"/api/integrations/github-app/install"}>
            Install Porter in more repositories
          </A>
          <NextStep
            text="Continue"
            disabled={false}
            onClick={nextStep}
            status={""}
            makeFlush={true}
            clearPosition={true}
            statusPosition="right"
            saveText=""
            successText="Project created successfully!"
          />
        </>
      )}
    </>
  );
};

export default ConnectSource;

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
  border: 1px solid #ffffff44;
  max-height: 200px;
  overflow-y: auto;
`;

const Row = styled.div<{ isLastItem?: boolean }>`
  width: 100%;
  height: 35px;
  color: #ffffff55;
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

const Subtitle = styled(TitleSection)`
  font-size: 16px;
  margin-top: 16px;
`;

const ConnectToGithubButton = styled.a`
  width: 150px;
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
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
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
