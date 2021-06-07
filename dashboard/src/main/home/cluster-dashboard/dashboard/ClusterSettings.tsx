import React, { useContext } from 'react'
import styled from 'styled-components';
import Heading from 'components/values-form/Heading';
import { Context } from 'shared/Context';



export const ClusterSettings = () => {
  const context = useContext(Context);
  return (
    <div>
      <StyledSettingsSection showSource={false}>
          <Heading>Additional Settings</Heading>
          <Button
            color="#b91133"
            onClick={() => context.setCurrentModal("UpdateClusterModal")}
          >
            Delete {context.currentCluster.name}
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
  margin-top: 20px;
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