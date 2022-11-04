import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import { Context } from "shared/Context";
import api from "shared/api";
import CheckboxRow from "components/form-components/CheckboxRow";
import Loading from "components/Loading";

const ClusterSettings: React.FC = () => {
  const {
    currentProject,
    currentCluster,
    setCurrentCluster,
    setCurrentModal,
    capabilities,
  } = useContext(Context);
  const [newClusterName, setNewClusterName] = useState<string>(
    currentCluster.name
  );
  const [newAWSClusterID, setNewAWSClusterID] = useState<string>(
    currentCluster.aws_cluster_id
  );
  const [successfulRename, setSuccessfulRename] = useState<boolean>(false);

  const [accessKeyId, setAccessKeyId] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [startRotateCreds, setStartRotateCreds] = useState<boolean>(false);
  const [successfulRotate, setSuccessfulRotate] = useState<boolean>(false);
  const [enableAgent, setEnableAgent] = useState(
    currentCluster.agent_integration_enabled
  );
  const [agentLoading, setAgentLoading] = useState(false);
  const [enablePreviewEnvs, setEnablePreviewEnvs] = useState(
    currentCluster.preview_envs_enabled
  );
  const [previewEnvsLoading, setPreviewEnvsLoading] = useState(false);

  let rotateCredentials = () => {
    api
      .overwriteAWSIntegration(
        "<token>",
        {
          aws_integration_id: currentCluster.aws_integration_id,
          aws_access_key_id: accessKeyId,
          aws_secret_access_key: secretKey,
          cluster_id: currentCluster.id,
        },
        {
          project_id: currentProject.id,
        }
      )
      .then(({ data }) => {
        setSuccessfulRotate(true);
      })
      .catch(() => {
        setSuccessfulRotate(false);
      });
  };

  let updateClusterName = () => {
    api
      .updateCluster(
        "<token>",
        {
          name: newClusterName,
          aws_cluster_id: newAWSClusterID,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(({ data }) => {
        setSuccessfulRename(true);
      })
      .catch(() => {
        setSuccessfulRename(false);
      });
  };

  let updateAgentIntegrationEnabled = () => {
    setAgentLoading(true);

    api
      .updateCluster(
        "<token>",
        {
          agent_integration_enabled: enableAgent,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(({ data }) => {
        setCurrentCluster(data);
        setAgentLoading(false);
      })
      .catch(() => {
        setAgentLoading(false);
      });
  };

  let updatePreviewEnvironmentsEnabled = () => {
    setPreviewEnvsLoading(true);

    api
      .updateCluster(
        "<token>",
        {
          preview_envs_enabled: enablePreviewEnvs,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(({ data }) => {
        setCurrentCluster(data);
        setPreviewEnvsLoading(false);
      })
      .catch(() => {
        setPreviewEnvsLoading(false);
      });
  };

  let helperText = (
    <Helper>
      Delete this cluster and underlying infrastructure. To ensure that
      everything has been properly destroyed, please visit your cloud provider's
      console. Instructions to properly delete all resources can be found
      <a
        target="none"
        href="https://docs.getporter.dev/docs/deleting-dangling-resources"
      >
        {" "}
        here
      </a>
      .
    </Helper>
  );

  if (!currentCluster?.infra_id || !currentCluster?.service) {
    helperText = (
      <Helper>
        Remove this cluster from Porter. Since this cluster was not provisioned
        by Porter, deleting the cluster will only detach this cluster from your
        project. To delete the cluster itself, you must do so manually. This
        operation cannot be undone.
      </Helper>
    );
  }

  let keyRotationSection = null;

  if (
    currentCluster?.aws_integration_id &&
    currentCluster?.aws_integration_id != 0
  ) {
    if (successfulRotate) {
      keyRotationSection = (
        <div>
          <Heading>Credential Rotation</Heading>
          <Helper>Successfully rotated credentials!</Helper>
        </div>
      );
    } else if (startRotateCreds) {
      keyRotationSection = (
        <div>
          <Heading>Credential Rotation</Heading>
          <Helper>Input the new credentials for the EKS cluster.</Helper>
          <InputRow
            type="text"
            value={accessKeyId}
            setValue={(x: string) => setAccessKeyId(x)}
            label="👤 AWS Access ID"
            placeholder="ex: AKIAIOSFODNN7EXAMPLE"
            width="100%"
            isRequired={true}
          />
          <InputRow
            type="password"
            value={secretKey}
            setValue={(x: string) => setSecretKey(x)}
            label="🔒 AWS Secret Key"
            placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
            width="100%"
            isRequired={true}
          />
          <Button color="#616FEEcc" onClick={rotateCredentials}>
            Submit
          </Button>
        </div>
      );
    } else {
      keyRotationSection = (
        <div>
          <Heading>Credential Rotation</Heading>
          <Helper>
            Rotate the credentials that Porter uses to connect to the cluster.
          </Helper>
          <Button color="#616FEEcc" onClick={() => setStartRotateCreds(true)}>
            Rotate Credentials
          </Button>
        </div>
      );
    }
  }

  let overrideAWSClusterNameSection =
    currentCluster?.aws_integration_id &&
    currentCluster?.aws_integration_id != 0 ? (
      <InputRow
        type="text"
        value={newAWSClusterID}
        setValue={(x: string) => setNewAWSClusterID(x)}
        label="AWS Cluster ID"
        placeholder="ex: my-awesome-cluster"
        width="100%"
        isRequired={false}
      />
    ) : null;

  let renameClusterSection = (
    <div>
      <Heading>Rename Cluster</Heading>
      <InputRow
        type="text"
        value={newClusterName}
        setValue={(x: string) => setNewClusterName(x)}
        label="Cluster Name"
        placeholder="ex: my-awesome-cluster"
        width="100%"
        isRequired={true}
      />
      {overrideAWSClusterNameSection}
      <Button color="#616FEEcc" onClick={updateClusterName}>
        Submit
      </Button>
    </div>
  );

  let enableAgentIntegration = (
    <div>
      <Heading>Enable Agent</Heading>
      <CheckboxRow
        label={"Allow the Porter agent to be installed on the cluster"}
        toggle={() => setEnableAgent(!enableAgent)}
        checked={enableAgent}
      />
      <Button color="#616FEEcc" onClick={updateAgentIntegrationEnabled}>
        Save
      </Button>
    </div>
  );

  if (agentLoading) {
    enableAgentIntegration = <Loading />;
  }

  let enablePreviewEnvironments = null;

  if (currentProject.preview_envs_enabled) {
    if (previewEnvsLoading) {
      enablePreviewEnvironments = <Loading />;
    } else {
      enablePreviewEnvironments = (
        <div>
          <Heading>Enable Preview Environments</Heading>
          <CheckboxRow
            label={"Create preview environments on this cluster"}
            toggle={() => setEnablePreviewEnvs(!enablePreviewEnvs)}
            checked={enablePreviewEnvs}
          />
          <Button color="#616FEEcc" onClick={updatePreviewEnvironmentsEnabled}>
            Save
          </Button>
        </div>
      );
    }
  }

  if (capabilities.version == "production") {
    enableAgentIntegration = null;
  }

  if (successfulRename) {
    renameClusterSection = (
      <div>
        <Heading>Credential Rotation</Heading>
        <Helper>Successfully renamed the cluster! Reload the page.</Helper>
      </div>
    );
  }

  return (
    <div>
      <StyledSettingsSection>
        {enableAgentIntegration}
        <DarkMatter />
        {enablePreviewEnvironments}
        <DarkMatter />
        {keyRotationSection}
        <DarkMatter />
        {renameClusterSection}
        <DarkMatter />
        <Heading>Delete Cluster</Heading>
        {helperText}
        <Button
          color="#b91133"
          onClick={() => setCurrentModal("UpdateClusterModal")}
        >
          Delete Cluster
        </Button>
      </StyledSettingsSection>
    </div>
  );
};

export default ClusterSettings;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -15px;
`;

const StyledSettingsSection = styled.div`
  margin-top: 35px;
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
  height: 100%;
`;

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 30px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;

const Warning = styled.div`
  font-size: 13px;
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-bottom: 20px;
`;
