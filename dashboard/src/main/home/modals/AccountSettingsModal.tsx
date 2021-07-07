import React, { useContext } from "react";
import styled from "styled-components";
import close from "../../../assets/close.png";
import { Context } from "../../../shared/Context";

const AccountSettingsModal = () => {
  const { setCurrentModal } = useContext(Context);

  const handleConnectGithub = () => {};

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
      {/* Will be styled (and show what account is connected) later */}
      No github integration detected. You can{" "}
      <A href={"/api/integrations/github-app/install"}>
        connect your GitHub account
      </A>
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
