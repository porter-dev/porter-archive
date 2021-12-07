import DynamicLink from "components/DynamicLink";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";
import Selector from "components/Selector";
import TitleSection from "components/TitleSection";
import React from "react";
import { useRouteMatch } from "react-router";
import styled from "styled-components";

const porterYamlDocsLink = "https://docs.porter.run";

const ConnectNewRepo = () => {
  const { url } = useRouteMatch();
  return (
    <div>
      <ControlRow>
        <BackButton to={`${url}?selected_tab=preview_environments`}>
          <i className="material-icons">close</i>
        </BackButton>
        <Title>Connect a new repo</Title>
      </ControlRow>

      <Heading>Select repo</Heading>
      <br />
      <Selector
        width="100%"
        options={[]}
        setActiveValue={console.log}
        activeValue=""
      />

      <Heading>Disclaimer</Heading>
      <Helper>
        You will need to add a porter.yaml file to let porter know how to create
        the preview environment
      </Helper>
      <PorterYamlLink to={porterYamlDocsLink} target="_blank">
        Know more about porter.yaml
      </PorterYamlLink>
      <ActionContainer>
        <SaveButton
          text="Connect repo"
          disabled={false}
          onClick={() => console.log()}
          makeFlush={true}
          clearPosition={true}
          status={""}
          statusPosition={"left"}
        ></SaveButton>
      </ActionContainer>
    </div>
  );
};

export default ConnectNewRepo;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const BackButton = styled(DynamicLink)`
  display: flex;
  width: 37px;
  z-index: 1;
  cursor: pointer;
  height: 37px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;
  color: white;
  > i {
    font-size: 20px;
  }

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const Title = styled(TitleSection)`
  margin-left: 10px;
  margin-bottom: 0;
  font-size: 18px;
`;

const PorterYamlLink = styled(DynamicLink)`
  font-size: 14px;
`;

const ActionContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 50px;
`;
