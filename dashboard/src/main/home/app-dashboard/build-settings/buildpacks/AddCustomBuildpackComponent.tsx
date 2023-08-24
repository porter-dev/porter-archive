import InputRow from "components/form-components/InputRow";
import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { Buildpack } from "../../types/buildpack";

function isValidURL(url: string): boolean {
  const pattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d{2,5})?([\/\w.-]*)*\/?$/i;
  return pattern.test(url);
}

const AddCustomBuildpackComponent: React.FC<{
  onAdd: (buildpack: Buildpack) => void;
}> = ({ onAdd }) => {
  const [buildpackUrl, setBuildpackUrl] = useState("");
  const [error, setError] = useState(false);

  const handleAddCustomBuildpack = () => {
    if (buildpackUrl === "" || !isValidURL(buildpackUrl)) {
      setError(true);
      return;
    }
    setBuildpackUrl("");
    onAdd({
      buildpack: buildpackUrl,
      name: buildpackUrl,
      config: {},
    });
  };

  return (
    <StyledCard marginBottom="0px">
      <ContentContainer>
        <EventInformation>
          <BuildpackInputContainer>
            GitHub or ZIP URL
            <BuildpackUrlInput
              placeholder="https://github.com/custom/buildpack"
              type="input"
              value={buildpackUrl}
              isRequired
              setValue={(newUrl) => {
                setError(false);
                setBuildpackUrl(newUrl as string);
              }}
            />
            <ErrorText hasError={error}>Please enter a valid url</ErrorText>
          </BuildpackInputContainer>
        </EventInformation>
      </ContentContainer>
      <ActionContainer>
        <ActionButton onClick={() => handleAddCustomBuildpack()}>
          <span className="material-icons-outlined">add</span>
        </ActionButton>
      </ActionContainer>
    </StyledCard>
  );
};

export default AddCustomBuildpackComponent;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div<{ marginBottom?: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #494b4f;
  background: ${({ theme }) => theme.fg};
  margin-bottom: ${(props) => props.marginBottom || "30px"};
  border-radius: 8px;
  padding: 14px;
  overflow: hidden;
  height: 60px;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const BuildpackInputContainer = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  padding-left: 15px;
`;

const BuildpackUrlInput = styled(InputRow)`
  width: auto;
  min-width: 300px;
  max-width: 600px;
  margin: unset;
  margin-left: 10px;
  display: inline-block;
`;

const ErrorText = styled.span`
  color: red;
  margin-left: 10px;
  display: ${(props: { hasError: boolean }) =>
    props.hasError ? "inline-block" : "none"};
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;