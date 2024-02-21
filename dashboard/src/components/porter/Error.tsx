import React, { useState } from "react";
import styled from "styled-components";

import Modal from "./Modal";
import Spacer from "./Spacer";
import Text from "./Text";

type Props = {
  message: string;
  metadata?:  Record<string, string>;
  ctaText?: string;
  ctaOnClick?: () => void;
  errorModalContents?: React.ReactNode;
  maxWidth?: string;
};

export const Error: React.FC<Props> = ({
  message,
    metadata,
  ctaText,
  ctaOnClick,
  errorModalContents,
  maxWidth,
}) => {
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  return (
    <>
      <StyledError maxWidth={maxWidth}>
        <i className="material-icons">error_outline</i>
        <Block>
          <Text color={"#ff385d"}>Error: {message}</Text>
          {ctaText && (errorModalContents != null || ctaOnClick != null) && (
            <>
              <Spacer y={0.5} />
              {metadata && Object.entries(metadata).map(
              ([key, value]) => (
              <>
                <div key={key}>
                  <ErrorMessageLabel>{key}:</ErrorMessageLabel>
                  <ErrorMessageContent>{value}</ErrorMessageContent>
                </div>
              </>
              )
              )}
              <Spacer y={0.5} />
              <Cta
                onClick={() => {
                  errorModalContents ? setErrorModalOpen(true) : ctaOnClick?.();
                }}
              >
                <Underline>{ctaText}</Underline>
                <i className="material-icons">open_in_new</i>
              </Cta>
            </>
          )}
        </Block>
      </StyledError>
      {errorModalOpen && (
        <Modal
          closeModal={() => {
            setErrorModalOpen(false);
          }}
        >
          {errorModalContents}
        </Modal>
      )}
    </>
  );
};

export default Error;

const Block = styled.div`
  display: block;
`;

const Underline = styled.span`
  text-decoration: underline;
`;

const Cta = styled.span`
  margin-left: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  color: #fff;

  > i {
    margin-left: 5px;
    font-size: 15px;
  }
`;

const StyledError = styled.div<{ maxWidth?: string }>`
  line-height: 1.5;
  color: #ff385d;
  font-size: 13px;
  display: flex;
  align-items: center;
  position: relative;
  padding-left: 25px;
  > i {
    font-size: 18px;
    margin-top: -1px;
    margin-right: 7px;
    float: left;
    position: absolute;
    top: 1px;
    left: 0;
  }
  max-width: ${(props) => props.maxWidth || "100%"};
`;

const ErrorMessageLabel = styled.span`
  font-weight: bold;
  margin-left: 10px;
  color: #9999aa;
  user-select: text;
`;
const ErrorMessageContent = styled.div`
  font-family: "Courier New", Courier, monospace;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 10px;
  user-select: text;
  cursor: text;
  color: #9999aa;
`;
