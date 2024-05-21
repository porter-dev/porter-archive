import React, { useContext, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import SaveButton from "components/SaveButton";
import InputRow from "components/form-components/InputRow";

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
    if (namespaceNameForDelition !== currentModalData?.metadata?.name) {
      setStatus("Please enter the name of this namespace to confirm deletion");
      return;
    }

    api
      .deleteNamespace(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: currentModalData?.metadata?.name,
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
    <>
      <Subtitle>
        Please insert the name of the namespace to delete it:
        <DangerText>{" " + currentModalData?.metadata?.name}</DangerText>
      </Subtitle>

      <InputWrapper>
        <DashboardIcon>
          <i className="material-icons">warning</i>
        </DashboardIcon>
        <InputRow
          type="string"
          value={namespaceNameForDelition}
          setValue={(x: string) => setNamespaceNameForDelition(x)}
          placeholder={currentModalData?.metadata?.name}
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
    </>
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
