import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import close from "../../../assets/close.png";
import { Context } from "../../../shared/Context";
import api from "../../../shared/api";
import Loading from "../../../components/Loading";

interface GithubAppAccessData {
  has_access: boolean;
  username?: string;
  accounts?: string[];
}

const AccountSettingsModal = () => {
  const { setCurrentModal } = useContext(Context);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const [accessData, setAccessData] = useState<GithubAppAccessData>({
    has_access: false,
  });

  useEffect(() => {
    api
      .getGithubAccess("<token>", {}, {})
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
      <CloseButton
        onClick={() => {
          setCurrentModal(null, null);
        }}
      >
        <CloseButtonImg src={close} />
      </CloseButton>
      <ModalTitle>Account Settings</ModalTitle>
      <Subtitle>Github Integration</Subtitle>
      <br />
      {accessError ? (
        <Placeholder>An error has occured.</Placeholder>
      ) : accessLoading ? (
        <LoadingWrapper>
          {" "}
          <Loading />
        </LoadingWrapper>
      ) : (
        <>
          {/* Will be styled (and show what account is connected) later */}
          {accessData.has_access ? (
            <Placeholder>
              Authorized as <b>{accessData.username}</b> <br />
              {!accessData.accounts || accessData.accounts.length == 0 ? (
                <>
                  It doesn't seem like the Porter application is installed in
                  any repositories you have access to.
                  <A href={"/api/integrations/github-app/install"}>
                    Install the application in more repositories
                  </A>
                </>
              ) : (
                <>
                  Additionally, porter has access to repos with the application
                  installed in them in the following organizations and accounts:{" "}
                  {accessData.accounts.map((name, i) => {
                    return (
                      <React.Fragment key={i}>
                        <b>{name}</b>
                        {i == accessData.accounts.length - 1 ? "" : ", "}
                      </React.Fragment>
                    );
                  })}{" "}
                  <br />
                  Don't see the right repos?{" "}
                  <A href={"/api/integrations/github-app/install"}>
                    Install the application in more repositories
                  </A>
                </>
              )}
            </Placeholder>
          ) : (
            <>
              No github integration detected. You can
              <A href={"/api/integrations/github-app/authorize"}>
                connect your GitHub account
              </A>
            </>
          )}
        </>
      )}
    </>
  );
};

export default AccountSettingsModal;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: "Assistant";
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Subtitle = styled.div`
  margin-top: 23px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: -10px;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
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
