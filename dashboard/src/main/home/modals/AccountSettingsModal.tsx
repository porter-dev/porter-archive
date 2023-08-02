import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import github from "assets/github.png";

import { Context } from "../../../shared/Context";
import api from "../../../shared/api";
import Loading from "../../../components/Loading";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

import TabSelector from "components/TabSelector";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import CopyToClipboard from "components/CopyToClipboard";
import copy from "assets/copy-left.svg"
import Icon from "components/porter/Icon";
interface GithubAppAccessData {
  username?: string;
  accounts?: string[];
}

const tabOptions = [{ label: "Integrations", value: "integrations" }];

const AccountSettingsModal = () => {
  const { setCurrentModal, currentProject } = useContext(Context);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const [accessData, setAccessData] = useState<GithubAppAccessData>({});
  const [clusters, setClusters] = useState<ClusterType[]>([]);
  const [registries, setRegistries] = useState<any[]>(null);

  const [currentTab, setCurrentTab] = useState("integrations");
  const IdTextWithCopy = ({ id }: { id: number }) => (
    <IdContainer>
      {id}
      <CopyToClipboard text={id.toString()}>
        <img src={copy} alt="copy" style={{ cursor: "pointer", marginLeft: "5px", width: "10px", height: "10px" }} />
      </CopyToClipboard>
    </IdContainer>
  );
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
  useEffect(() => {
    if (currentProject) {
      const project_id = currentProject.id;

      api
        .getProjectRegistries("<token>", {}, { id: project_id })
        .then((res: any) => {
          setRegistries(res.data);
        })
        .catch((err: any) => console.log(err));

      api
        .getClusters("<token>", {}, { id: currentProject?.id })
        .then((res) => {
          if (res.data) {
            let clusters = res.data;
            clusters.sort((a: any, b: any) => a.id - b.id);
            if (clusters.length > 0) {
              let options = clusters.map((item: { name: any; vanity_name: string; }) => ({
                label: (item.vanity_name ? item.vanity_name : item.name),
                value: item.name
              }));
              setClusters(clusters);
            }
          }
        });
    }
  }, [currentProject]);

  const renderTabs = () => {
    switch (currentTab) {
      case "integrations":
        return <>
          <Heading>
            <GitIcon src={github} /> GitHub
          </Heading>
          {
            accessLoading ? (
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
                      <Spacer inline width="5px" />
                      <Link target="_blank" to={"/api/integrations/github-app/oauth"} hasunderline>
                        Authorize Porter to view your repositories
                      </Link>
                    </Helper>
                  </ListWrapper>
                )}

                {/* Will be styled (and show what account is connected) later */}
                {!accessError && accessData.username && (
                  <Placeholder>
                    <User>
                      You are currently authorized as <B>{accessData.username}</B> and
                      have access to:
                    </User>
                    {!accessData.accounts || accessData.accounts?.length == 0 ? (
                      <ListWrapper>
                        <Helper>
                          No connected repositories found.
                          <Spacer inline width="5px" />
                          <Link
                            target="_blank"
                            to={"/api/integrations/github-app/install"}
                            hasunderline
                          >
                            Install Porter in your repositories
                          </Link>
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
                        <Link target="_blank" to={"/api/integrations/github-app/install"} hasunderline>
                          Install Porter in more repositories
                        </Link>
                      </>
                    )}
                  </Placeholder>
                )}
              </>
            )
          }
        </>;
      case "metadata":
        return <>
          <Spacer y={1} />
          <div>
            <Text>Project Id: </Text>
            <IdTextWithCopy id={currentProject?.id} />
          </div>

          {clusters?.length > 0 &&
            <>
              <Text>Cluster ids:</Text>
              {clusters.map((cluster, index) =>
                <div key={index}>
                  <IdTextWithCopy id={cluster.id} />
                </div>
              )}
            </>}


          {registries?.length > 0 &&
            <>
              <Text>Registry ids:</Text>
              {registries.map((registry, index) =>
                <div key={index}>
                  <IdTextWithCopy id={registry.id} />
                </div>
              )}
            </>}
        </>
    }
  }
  return (
    <>
      <TabSelector
        options={tabOptions}
        currentTab={currentTab}
        setCurrentTab={(value: string) => setCurrentTab(value)}
      />
      {renderTabs()}

    </>

  );
}

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
  height: 240px;
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
  max-height: 120px;
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

const IdContainer = styled.div`
  background: #171a21;
  border-radius: 5px;
  padding: 5px;
  display: block; // Changed from inline-block to block for new line
  width: 100%; // Span the entire width
  margin: 0; // No margin between each IdContainer
`;