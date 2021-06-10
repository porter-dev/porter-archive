import React, { useContext } from 'react'
import styled from 'styled-components';
import Heading from 'components/values-form/Heading';
import Helper from "components/values-form/Helper";
import { Context } from 'shared/Context';

export const ClusterSettings = () => {
  const context = useContext(Context);

  let helperText = <Helper>
    Delete this cluster and underlying infrastructure. To
    ensure that everything has been properly destroyed, please visit
    your cloud provider's console. Instructions to properly delete all
    resources can be found
    <a
      target="none"
      href="https://docs.getporter.dev/docs/deleting-dangling-resources"
    >
      {" "}
      here
    </a>.
  </Helper>

  if (!context.currentCluster?.infra_id || !context.currentCluster?.service) {
    helperText = <Helper>
      Remove this cluster from Porter. Since this cluster was not provisioned by Porter, deleting the
      cluster will only detach this cluster from your project. To delete the cluster itself, you must 
      do so manually. This operation cannot be undone. 
    </Helper>
  }

  return (
    <div>
      <StyledSettingsSection showSource={false}>
          <Heading>Delete Cluster</Heading>
          {helperText}
          <Button
            color="#b91133"
            onClick={() => context.setCurrentModal("UpdateClusterModal")}
          >
            Delete Cluster
          </Button>
        </StyledSettingsSection>
    </div>
  )
}


const StyledSettingsSection = styled.div<{ showSource: boolean }>`
  margin-top: 35px;
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 50px;
  position: relative;
  border-radius: 5px;
  overflow: auto;
  height: ${(props) => (props.showSource ? "calc(100% - 55px)" : "100%")};
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
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
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
