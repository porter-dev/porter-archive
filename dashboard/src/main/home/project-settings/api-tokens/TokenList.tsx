import Description from "components/Description";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";

import api from "shared/api";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import { APIToken, APITokenMeta } from "../APITokensSection";

type Props = {
  tokens: APITokenMeta[];
  setExpanded: (id: string) => void;
  expanded: string;
  revokeToken: (id: string) => void;
};

const TokenList: React.FunctionComponent<Props> = (props) => {
  const [expandedTok, setExpandedTok] = useState<APIToken>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { currentProject } = useContext(Context);

  useEffect(() => {
    if (props.expanded != "") {
      setIsLoading(true);

      api
        .getAPIToken(
          "<token>",
          {},
          { project_id: currentProject.id, token: props.expanded }
        )
        .then(({ data }) => {
          setExpandedTok(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [currentProject, props.expanded]);

  const revokeAPIToken = (id: string) => {
    setIsLoading(true);

    api
      .revokeAPIToken(
        "<token>",
        {},
        { project_id: currentProject.id, token: id }
      )
      .then(() => {
        props.revokeToken(id);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const renderExpandedContents = () => {
    if (isLoading || !expandedTok) {
      return (
        <Placeholder>
          <Loading />
        </Placeholder>
      );
    }

    return (
      <StyledExpandedToken>
        <Description margin="0">
          Created at {readableDate(expandedTok.created_at)}. Using token policy:{" "}
          {expandedTok.policy_name}.
        </Description>
        <RevokeAccessButtonWrapper>
          <RevokeAccessButton onClick={() => revokeAPIToken(expandedTok.id)}>
            Revoke Token
          </RevokeAccessButton>
        </RevokeAccessButtonWrapper>
      </StyledExpandedToken>
    );
  };

  return (
    <>
      {props.tokens.map((token) => {
        if (props.expanded == token.id) {
          return (
            <TokenWrapper>
              <TokenHeader
                key={token.id}
                onClick={() => {
                  setIsLoading(false);
                  props.setExpanded("");
                }}
              >
                <Flex>
                  <i className="material-icons">token</i>
                  {token.name}
                </Flex>
                <Right>
                  <RightHeaderSection>
                    <TimestampSection>
                      Expires at {readableDate(token.expires_at)}
                    </TimestampSection>
                    <i className="material-icons">expand_less</i>
                  </RightHeaderSection>
                </Right>
              </TokenHeader>
              {renderExpandedContents()}
            </TokenWrapper>
          );
        }

        return (
          <TokenWrapper>
            <TokenHeader
              key={token.id}
              onClick={() => {
                setIsLoading(true);
                props.setExpanded(token.id);
              }}
            >
              <Flex>
                <i className="material-icons">token</i>
                {token.name}
              </Flex>
              <Right>
                <RightHeaderSection>
                  <TimestampSection>
                    Expires at {readableDate(token.expires_at)}
                  </TimestampSection>
                  <i className="material-icons">expand_more</i>
                </RightHeaderSection>
              </Right>
            </TokenHeader>
          </TokenWrapper>
        );
      })}
    </>
  );
};

export default TokenList;

const TokenWrapper = styled.div`
  color: #ffffff55;
  background: #ffffff01;
  border: 1px solid #aaaabbaa;
  font-size: 13px;
  border-radius: 5px;
  cursor: pointer;
  margin: 8px 0;
  :hover {
    border: 1px solid #aaaabb;
  }
`;

const TokenHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 15px;
  justify-content: space-between;
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

const StyledExpandedToken = styled.div`
  padding: 12px 20px;
  max-height: 300px;
  overflow-y: auto;
`;

const ExpandIconContainer = styled.div`
  width: 30px;
  margin-left: 10px;
  padding-top: 2px;
`;

const RightHeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TimestampSection = styled.div`
  margin-right: 8px;
`;

const RevokeAccessButton = styled.div`
  display: inline-block;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  padding: 6px 10px;
  text-align: center;
  border: 1px solid #ffffff55;
  border-radius: 4px;
  background: #ffffff11;
  color: #ffffffdd;
  cursor: pointer;
  width: 120px;
  :hover {
    background: #ffffff22;
  }
`;

const RevokeAccessButtonWrapper = styled.div`
  width: 100%;
  text-align: right;
  margin-top: 12px;
`;
