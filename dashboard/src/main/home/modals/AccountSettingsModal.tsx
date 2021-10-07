import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import github from "assets/github.png";

import { Context } from "../../../shared/Context";
import api from "../../../shared/api";
import Loading from "../../../components/Loading";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

import TabSelector from "components/TabSelector";

interface GithubAppAccessData {
  username?: string;
  accounts?: string[];
}

const tabOptions = [{ label: "Integrations", value: "integrations" }];

const AccountSettingsModal = () => {
  const { setCurrentModal } = useContext(Context);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const [accessData, setAccessData] = useState<GithubAppAccessData>({});

  const [currentTab, setCurrentTab] = useState("integrations");

  useEffect(() => {
    api
      .getGithubAccounts("<token>", {}, {})
      .then(({ data }) => {
        setAccessData(data);
        setAccessLoading(false);
      })
      .catch(() => {
        setAccessError(true);
        setAccessLoading(false);
      });
  }, []);

  return (
    <>
      <TabSelector
        options={tabOptions}
        currentTab={currentTab}
        setCurrentTab={(value: string) => setCurrentTab(value)}
      />

      <Heading>
        <GitIcon src={github} /> Github
      </Heading>
      {accessLoading ? (
        <LoadingWrapper>
          {" "}
          <Loading />
        </LoadingWrapper>
      ) : (
        <>
          {accessError && (
            <ListWrapper>
              <Helper>
                No connected repositories found.
                <A href={"/api/integrations/github-app/oauth"}>
                  Authorize Porter to view your repositories.
                </A>
              </Helper>
            </ListWrapper>
          )}

          {/* Will be styled (and show what account is connected) later */}
          {!accessError && accessData.accounts?.length >= 0 && (
            <Placeholder>
              <User>
                You are currently authorized as <B>{accessData.username}</B> and
                have access to:
              </User>
              {!accessData.accounts || accessData.accounts?.length == 0 ? (
                <ListWrapper>
                  <Helper>
                    No connected repositories found.
                    <A href={"/api/integrations/github-app/install"}>
                      Install Porter in your repositories
                    </A>
                  </Helper>
                </ListWrapper>
              ) : (
                <>
                  <List>
                    {accessData.accounts.map((name, i) => {
                      return (
                        <React.Fragment key={i}>
                          <Row
                            isLastItem={i === accessData.accounts.length - 1}
                          >
                            <i className="material-icons">bookmark</i>
                            {name}
                          </Row>
                        </React.Fragment>
                      );
                    })}
                  </List>
                  <br />
                  Don't see the right repos?{" "}
                  <A href={"/api/integrations/github-app/install"}>
                    Install Porter in more repositories
                  </A>
                </>
              )}
            </Placeholder>
          )}
        </>
      )}
    </>
  );
};

export default AccountSettingsModal;

const B = styled.b`
  color: #ffffff;
`;

const User = styled.div`
  margin-top: 14px;
  font-size: 13px;
`;

const ListWrapper = styled.div`
  width: 100%;
  height: 250px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin-top: 20px;
  padding: 40px;
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

const GitIcon = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 10px;
  filter: brightness(120%);
  margin-left: 1px;
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;

const LoadingWrapper = styled.div`
  height: 50px;
`;

const Placeholder = styled.div`
  color: #aaaabb;
  font-size: 13px;
  margin-left: 0px;
  line-height: 1.6em;
  user-select: none;
`;
