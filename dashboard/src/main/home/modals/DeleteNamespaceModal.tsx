import React, { Component, useContext, useMemo, useState } from "react";
import styled from "styled-components";
import close from "assets/close.png";

import api from "shared/api";
import { Context } from "shared/Context";

import SaveButton from "components/SaveButton";
import InputRow from "components/values-form/InputRow";

const DeleteNamespaceModal = () => {
  const {
    currentModalData,
    currentCluster,
    currentProject,
    setCurrentError,
    setCurrentModal,
  } = useContext(Context);
  const [namespaceNameForDelition, setNamespaceNameForDelition] = useState("");
  const [status, setStatus] = useState<string>(null as string);
  const deleteNamespace = () => {
    if (namespaceNameForDelition !== currentModalData.metadata.name) {
      setStatus("Please insert the name of the namespace to confirm deletion");
      return;
    }

    api
      .deleteNamespace(
        "<token>",
        { name: currentModalData.metadata.name, cluster_id: currentCluster.id },
        {
          id: currentProject.id,
        }
      )
      .then((res) => {
        if (res.status === 200) {
          setStatus("successful");
          setTimeout(() => {
            setCurrentModal(null, null);
          }, 1000);
        }
      })
      .catch((err) => {
        setCurrentError(err);
      });
  };

  return (
    <StyledUpdateProjectModal>
      <CloseButton
        onClick={() => {
          setCurrentModal(null, null);
        }}
      >
        <CloseButtonImg src={close} />
      </CloseButton>

      <ModalTitle>Delete Namespace</ModalTitle>
      <Subtitle>
        Please insert the name of the namespace to delete it:
        <DangerText>{" " + currentModalData.metadata.name}</DangerText>
      </Subtitle>

      <InputWrapper>
        <DashboardIcon>
          <i className="material-icons">warning</i>
        </DashboardIcon>
        <InputRow
          type="string"
          value={namespaceNameForDelition}
          setValue={(x: string) => setNamespaceNameForDelition(x)}
          placeholder={currentModalData.metadata.name}
          width="480px"
        />
      </InputWrapper>
      <Warning highlight={true}>
        ⚠️ Deleting this namespace will remove all resources attached to this
        namespace.
      </Warning>
      <SaveButton
        text="Delete Namespace"
        color="#e62659"
        onClick={() => deleteNamespace()}
        status={status}
      />
    </StyledUpdateProjectModal>
  );
};

export default DeleteNamespaceModal;

const DangerText = styled.span`
  color: #ed5f85;
`;

const DashboardIcon = styled.div`
  width: 32px;
  margin-top: 6px;
  min-width: 25px;
  height: 32px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 15px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  color: white;

  > i {
    font-size: 17px;
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
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

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: Work Sans, sans-serif;
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
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

const StyledUpdateProjectModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;

const Warning = styled.div`
  font-size: 13px;
  display: flex;
  border-radius: 3px;
  width: calc(100%);
  margin-top: 10px;
  margin-left: 2px;
  line-height: 1.4em;
  align-items: center;
  color: white;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
`;
