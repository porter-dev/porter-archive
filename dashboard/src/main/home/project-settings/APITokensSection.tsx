import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { InviteType } from "shared/types";
import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "components/Loading";
import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import Heading from "components/form-components/Heading";
import CopyToClipboard from "components/CopyToClipboard";
import { Column } from "react-table";
import Table from "components/Table";
import RadioSelector from "components/RadioSelector";
import CreateAPITokenForm from "./api-tokens/CreateAPITokenForm";
import TokenList from "./api-tokens/TokenList";
import SaveButton from "components/SaveButton";

type Props = {};

export type APITokenMeta = {
  created_at: string;
  updated_at: string;
  expires_at: string;
  id: string;
  policy_name: string;
  policy_uid: string;
  name: string;
};

export type APIToken = APITokenMeta & {
  token?: string;
};

const APITokensSection: React.FunctionComponent<Props> = ({}) => {
  const { currentProject } = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [apiTokens, setAPITokens] = useState<Array<APITokenMeta>>([]);
  const [shouldCreate, setShouldCreate] = useState(false);
  const [expanded, setExpanded] = useState("");

  useEffect(() => {
    api
      .listAPITokens("<token>", {}, { project_id: currentProject.id })
      .then(({ data }) => {
        setAPITokens(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [currentProject, shouldCreate]);

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (shouldCreate) {
    return (
      <CreateAPITokenForm
        onCreate={() => setShouldCreate(false)}
        back={() => setShouldCreate(false)}
      />
    );
  }

  const getTokenList = () => {
    return apiTokens.map((token) => {
      return <div>{token.name}</div>;
    });
  };

  const revokeToken = (id: string) => {
    setAPITokens((toks) => toks.filter((tok) => tok.id !== id));
  };

  return (
    <APITokensSectionWrapper>
      <Heading isAtTop={true}>API Tokens</Heading>
      <Helper>
        This displays all active API tokens, which are tokens that have not
        expired and have not been revoked.
      </Helper>
      <TokenListWrapper>
        <TokenList
          tokens={apiTokens}
          setExpanded={setExpanded}
          expanded={expanded}
          revokeToken={revokeToken}
        />
      </TokenListWrapper>
      <SaveButtonContainer>
        <SaveButton
          makeFlush={true}
          clearPosition={true}
          onClick={() => setShouldCreate(true)}
        >
          <i className="material-icons">add</i>
          Create API Token
        </SaveButton>
      </SaveButtonContainer>
    </APITokensSectionWrapper>
  );
};

export default APITokensSection;

const Flex = styled.div`
  display: flex;
  align-items: center;
  width: 70px;
  float: right;
  justify-content: space-between;
`;

const DeleteButton = styled.div`
  display: flex;
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  align-items: center;
  justify-content: center;
  width: 30px;
  float: right;
  height: 30px;
  :hover {
    background: #ffffff11;
    border-radius: 20px;
    cursor: pointer;
  }

  > i {
    font-size: 20px;
    color: #ffffff44;
    border-radius: 20px;
  }
`;

const SettingsButton = styled(DeleteButton)`
  margin-right: -60px;
`;

const Role = styled.div`
  text-transform: capitalize;
  margin-right: 50px;
`;

const RoleSelectorWrapper = styled.div`
  font-size: 14px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  margin-top: 23px;
  justify-content: center;
  background: #ffffff11;
  border-radius: 5px;
  color: #ffffff44;
  font-size: 13px;
`;

const ButtonWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const InputRowWrapper = styled.div`
  width: 40%;
`;

const CopyButton = styled.div`
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
  margin: 8px 0 8px 12px;
  float: right;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120px;
  cursor: pointer;
  height: 30px;
  border-radius: 5px;
  border: 1px solid #ffffff20;
  background-color: #ffffff10;
  overflow: hidden;
  transition: all 0.1s ease-out;
  :hover {
    border: 1px solid #ffffff66;
    background-color: #ffffff20;
  }
`;

const NewLinkButton = styled(CopyButton)`
  border: none;
  width: auto;
  float: none;
  display: block;
  margin: unset;
  background-color: transparent;
  :hover {
    border: none;
    background-color: transparent;
  }
`;

const InviteButton = styled.div<{ disabled: boolean }>`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 15px;
  margin-top: 13px;
  text-align: left;
  float: left;
  margin-left: 0;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? "#616FEEcc" : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
  margin-bottom: 10px;
`;

const Url = styled.a`
  max-width: 300px;
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :hover {
    cursor: pointer;
  }
`;

const Invalid = styled.div`
  color: #f5cb42;
  margin-left: 15px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const Status = styled.div<{ status: "accepted" | "expired" | "pending" }>`
  padding: 5px 10px;
  margin-right: 12px;
  background: ${(props) => {
    if (props.status === "accepted") return "#38a88a";
    if (props.status === "expired") return "#cc3d42";
    if (props.status === "pending") return "#ffffff11";
  }};
  font-size: 13px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 25px;
  max-width: 80px;
  text-transform: capitalize;
  font-weight: 400;
  user-select: none;
`;

const TokenListWrapper = styled.div`
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
`;

const APITokensSectionWrapper = styled.div`
  width: 60%;
  min-width: 600px;
`;

const ControlRow = styled.div`
  width: 100%;
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const SaveButtonContainer = styled.div`
  position: relative;
  margin-top: 20px;
`;
