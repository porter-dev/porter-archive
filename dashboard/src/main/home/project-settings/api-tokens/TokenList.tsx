import React from "react";
import styled from "styled-components";
import { APITokenMeta } from "../APITokensSection";

type Props = {
  tokens: APITokenMeta[];
};

const TokenList: React.FunctionComponent<Props> = (props) => {
  return (
    <>
      {props.tokens.map((token) => {
        return (
          <PreviewRow key={token.id}>
            <Flex>
              <i className="material-icons">token</i>
              {token.name}
            </Flex>
            <Right>Expires at {token.expires_at}</Right>
          </PreviewRow>
        );
      })}
    </>
  );
};

export default TokenList;

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
