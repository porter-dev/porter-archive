import Heading from "components/form-components/Heading";
import React, { useContext } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";

const Settings = ({
  stackName,
  onDelete,
}: {
  stackName: string;
  onDelete: () => void;
}) => {
  const { setCurrentOverlay } = useContext(Context);

  const handleDelete = () => {
    setCurrentOverlay({
      message: `Are you sure you want to delete ${stackName}?`,
      onYes: () => {
        onDelete();
        setCurrentOverlay(null);
      },
      onNo: () => setCurrentOverlay(null),
    });
  };
  return (
    <Wrapper>
      <StyledSettingsSection>
        <Heading>Settings</Heading>
        <Button color="#b91133" onClick={handleDelete}>
          Delete stack
        </Button>
      </StyledSettingsSection>
    </Wrapper>
  );
};

export default Settings;

const Wrapper = styled.div`
  width: 100%;
  padding-bottom: 65px;
  height: 100%;
`;

const StyledSettingsSection = styled.div`
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
  height: calc(100% - 55px);
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
