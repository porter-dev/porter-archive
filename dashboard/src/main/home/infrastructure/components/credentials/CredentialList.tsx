import React from "react";
import styled from "styled-components";
import { readableDate } from "shared/string_utils";

type Props = {
  selectCredential: (id: number) => void;
  credentials: GenericCredential[];
  addNewText: string;
  shouldCreateCred: () => void;
  isLink?: boolean;
  linkHref?: string;
};

type GenericCredential = {
  id: number;
  display_name: string;
  created_at: string;
};

const CredentialList: React.FunctionComponent<Props> = (props) => {
  const renderCreateSection = () => {
    let inner = (
      <Flex>
        <i className="material-icons">account_circle</i>
        {props.addNewText}
      </Flex>
    );

    if (props.isLink) {
      return <CreateNewRowLink href={props.linkHref}>{inner}</CreateNewRowLink>;
    }

    return (
      <CreateNewRow onClick={props.shouldCreateCred}>{inner}</CreateNewRow>
    );
  };

  return (
    <>
      {props.credentials.map((cred) => {
        return (
          <PreviewRow
            key={cred.id}
            onClick={() => props.selectCredential(cred.id)}
          >
            <Flex>
              <i className="material-icons">account_circle</i>
              {cred.display_name || "Name N/A"}
            </Flex>
            <Right>Connected at {readableDate(cred.created_at)}</Right>
          </PreviewRow>
        );
      })}
      {renderCreateSection()}
    </>
  );
};

export default CredentialList;

const PreviewRow = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 15px;
  color: #ffffff55;
  background: #ffffff01;
  border: 1px solid #aaaabb;
  justify-content: space-between;
  font-size: 13px;
  border-radius: 5px;
  cursor: pointer;
  margin: 16px 0;

  :hover {
    background: #ffffff10;
  }
`;

const Flex = styled.div`
  display: flex;
  color: #ffffff;
  align-items: center;
  > i {
    color: #aaaabb;
    font-size: 20px;
    margin-right: 10px;
  }
`;

const Right = styled.div`
  text-align: right;
`;

const CreateNewRow = styled(PreviewRow)`
  background: none;
`;

const CreateNewRowLink = styled.a`
  background: none;
  display: flex;
  align-items: center;
  padding: 12px 15px;
  color: #ffffff55;
  background: #ffffff01;
  border: 1px solid #aaaabb;
  justify-content: space-between;
  font-size: 13px;
  border-radius: 5px;
  cursor: pointer;
  margin: 16px 0;

  :hover {
    background: #ffffff10;
  }
`;
