import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import github from "assets/github.png";

import api from "../../../shared/api";
import { Context } from "shared/Context";
import Loading from "../../../components/Loading";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import ConfirmOverlay from "../../../components/ConfirmOverlay";

interface Environment {
  id: Number;
  project_id: number;
  cluster_id: number;
  git_installation_id: number;
  name: string;
  git_repo_owner: string;
  git_repo_name: string;
}

const PreviewEnvSettingsModal = () => {
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const [accessData, setAccessData] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>();

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  useEffect(() => {
    api
      .listEnvironments(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(({ data }) => {
        // console.log("github account", data);

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setAccessData(data);
        setAccessLoading(false);
      })
      .catch(() => {
        setAccessError(true);
        setAccessLoading(false);
      });
  }, []);

  const handleDelete = () => {
    api
      .deleteEnvironment(
        "<token>",
        {
          name: "preview",
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          git_installation_id: selectedEnvironment.git_installation_id,
          git_repo_owner: selectedEnvironment.git_repo_owner,
          git_repo_name: selectedEnvironment.git_repo_name,
        }
      )
      .then(() => {
        setSelectedEnvironment(null);
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
      });
  };

  return (
    <>
      <ConfirmOverlay
        show={selectedEnvironment != null}
        message={`Are you sure you want to disable preview environments in 
          ${selectedEnvironment?.git_repo_owner}/${selectedEnvironment?.git_repo_name}?`}
        onYes={handleDelete}
        onNo={() => setSelectedEnvironment(null)}
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
              <Helper>No connected repositories found.</Helper>
            </ListWrapper>
          )}

          {/* Will be styled (and show what account is connected) later */}
          {!accessError && accessData.length > 0 && (
            <Placeholder>
              <User>
                Preview environments are enabled in the following repositories:
              </User>
              {accessData.length == 0 ? (
                <ListWrapper>
                  <Helper>No connected repositories found.</Helper>
                </ListWrapper>
              ) : (
                <>
                  <List>
                    {accessData.map((e, i) => {
                      return (
                        <React.Fragment key={i}>
                          <Row isLastItem={false}>
                            <Flex>
                              <i className="material-icons">bookmark</i>
                              {`${e.git_repo_owner}/${e.git_repo_name}`}
                            </Flex>
                            <DisableButton
                              onClick={() => {
                                setSelectedEnvironment(e);
                              }}
                            >
                              <i className="material-icons">delete</i>
                            </DisableButton>
                          </Row>
                        </React.Fragment>
                      );
                    })}
                  </List>
                  <br />
                </>
              )}
            </Placeholder>
          )}
        </>
      )}
    </>
  );
};

export default PreviewEnvSettingsModal;

const DisableButton = styled.div`
  margin-right: 13px;
  cursor: pointer;

  > i {
    margin-top: 5px;
    font-size: 18px;
    :hover {
      color: #ffffff44;
    }
  }
`;

const Flex = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  > i {
    font-size: 17px;
    margin-left: 10px;
    margin-right: 12px;
    color: #ffffff44;
  }
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
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
