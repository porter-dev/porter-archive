import React, { useState } from "react";
import ConfirmOverlay from "../../../components/ConfirmOverlay";
import styled from "styled-components";

interface Props {
  slackData: any[];
}

const SlackIntegrationList: React.FC<Props> = (props) => {
  const [isDelete, setIsDelete] = useState(false);
  const [deleteObj, setDeleteObj] = useState({
    id: 0,
    team_name: "",
    team_id: "",
    channel: "",
  }); // guaranteed to be set when used

  return (
    <>
      <ConfirmOverlay
        show={isDelete}
        message={`Are you sure you want to delete the slack integration for team ${
          deleteObj.team_name || deleteObj.team_id
        } in channel ${deleteObj.channel}?`}
        onYes={() => {
          setIsDelete(false);
        }}
        onNo={() => setIsDelete(false)}
      />
      <StyledIntegrationList>
        {props.slackData.map((inst) => {
          return (
            <Integration
              onClick={() => {}}
              disabled={false}
              key={`${inst.team_id}-${inst.channel}`}
            >
              <MainRow disabled={false}>
                <Flex>
                  <Icon src={inst.team_icon_url && inst.team_icon_url} />
                  <Label>
                    {inst.team_name || inst.team_id} - {inst.channel}
                  </Label>
                </Flex>
                <i
                  className="material-icons"
                  onClick={() => {
                    setDeleteObj(inst);
                    setIsDelete(true);
                  }}
                >
                  delete
                </i>
              </MainRow>
            </Integration>
          );
        })}
      </StyledIntegrationList>
    </>
  );
};

export default SlackIntegrationList;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const StyledIntegrationList = styled.div`
  margin-top: 20px;
  margin-bottom: 80px;
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  border-radius: 5px;
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
    > i {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: #ffffff44;
    margin-right: -7px;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  background: #26282f;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  margin-bottom: 15px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
`;

const Icon = styled.img`
  width: 27px;
  margin-right: 12px;
  margin-bottom: -1px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    padding: 3px;
    margin-right: 11px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;
