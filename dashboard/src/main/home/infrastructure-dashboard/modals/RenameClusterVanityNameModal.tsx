import React, { useCallback, useContext, useState } from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import Icon from "components/porter/Icon";
import Input from "components/porter/Input";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { Context } from "shared/Context";
import infra from "assets/cluster.svg";

import { useClusterContext } from "../ClusterContextProvider";

type Props = {
  onClose: () => void;
};
const RenameClusterVanityNameModal: React.FC<Props> = ({ onClose }) => {
  // TODO: replace this with an invalidate cluster list query
  const { setShouldRefreshClusters } = useContext(Context);
  const { cluster, updateClusterVanityName } = useClusterContext();
  const [clusterName, setClusterName] = useState(cluster.vanity_name);
  const [status, setStatus] = useState("");

  const renameCluster = useCallback(async (): Promise<void> => {
    setStatus("loading");
    try {
      updateClusterVanityName(clusterName);
      setStatus("success");
      setShouldRefreshClusters?.(true);
      onClose();
    } catch (err) {
      setStatus("error");
    }
  }, [clusterName, updateClusterVanityName, onClose]);

  return (
    <Modal width="600px" closeModal={onClose}>
      <Text size={16}>Cluster name</Text>
      <Spacer height="15px" />
      <Flex>
        <IconWrapper>
          <Icon src={infra} />
        </IconWrapper>
        <Spacer inline />
        <Input
          placeholder="ex: my-cluster"
          width="100%"
          value={clusterName}
          setValue={setClusterName}
        />
      </Flex>
      <Spacer y={1} />
      <Button
        onClick={renameCluster}
        disabled={clusterName === ""}
        status={status}
        helperText="Note: The vanity name for your cluster will not change the cluster's name in your cloud provider."
      >
        Save
      </Button>
    </Modal>
  );
};

export default RenameClusterVanityNameModal;

const IconWrapper = styled.div`
  min-width: 35px;
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #494b4f;
  border-radius: 5px;
  cursor: not-allowed;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;
