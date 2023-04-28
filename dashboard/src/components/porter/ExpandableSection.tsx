import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Container from "./Container";
import CopyToClipboard from "components/CopyToClipboard";

type Props = {
  isInitiallyExpanded?: boolean;
  Header: any;
  ExpandedSection: any;
  color?: any;
  background?: string;
  noWrapper?: boolean;
  expandText?: string;
  collapseText?: string;
  maxHeight?: string;
  spaced?: boolean;
  copy?: string;
};

const ExpandableSection: React.FC<Props> = ({
  isInitiallyExpanded,
  Header,
  ExpandedSection,
  color,
  background,
  noWrapper,
  expandText,
  collapseText,
  maxHeight,
  spaced,
  copy,
}) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded ?? false);

  return (
    <StyledExpandableSection
      isExpanded={isExpanded}
      background={background}
      noWrapper={noWrapper}
    >
      {noWrapper ? (
        <Container row spaced={spaced}>
          {Header}
          {copy ?
            (
              <CopyWrapper>
                <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? collapseText : expandText}
                </ExpandButton>
                <CopyToClipboard
                  as="i"
                  text={copy}
                  wrapperProps={{
                    className: "material-icons",
                  }}
                >
                  content_copy
                </CopyToClipboard>
              </CopyWrapper>
            ) :
            (
              <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? collapseText : expandText}
              </ExpandButton>
            )
          }
        </Container>
      ) : (
        <HeaderRow
          isExpanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          color={color}
        >
          {!noWrapper && <i className="material-icons">arrow_drop_down</i>}
          {Header}
        </HeaderRow>
      )}
      {
        isExpanded && (
          ExpandedSection
        )
      }
    </StyledExpandableSection>
  );
};

export default ExpandableSection;

const ExpandButton = styled.div`
  margin-left: 15px;
  color: #aaaabb;
  cursor: pointer;
  font-size: 13px;
  :hover {
    color: #ffffff;
  }
`;

const HeaderRow = styled.div<{
  isExpanded: boolean;
  color?: string;
}>`
  display: flex;
  align-items: center;
  height: 40px;
  font-size: 13px;
  width: 100%;
  margin-top: -1px;
  padding-left: 10px;
  cursor: pointer;
  :hover {
    background: ${props => props.isExpanded && "#ffffff18"};
  }

  > i {
    margin-right: 8px;
    color: ${props => props.color || "#ffffff66"};
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${props => props.isExpanded ? "" : "rotate(-90deg)"};
  }
`;

const StyledExpandableSection = styled.div<{
  isExpanded: boolean;
  background?: string;
  noWrapper?: boolean;
}>`
  width: 100%;
  height: ${props => (props.isExpanded || props.noWrapper) ? "" : "40px"};
  max-height: 350px;
  overflow: hidden;
  border-radius: 5px;
  background: ${props => !props.noWrapper && (props.background || "#26292e")};
  border: ${props => !props.noWrapper && "1px solid #494b4f"};
  :hover {
    border: ${props => !props.noWrapper && "1px solid #7a7b80"};
  }
  animation: ${props => props.isExpanded ? "expandRevisions 0.3s" : ""};
  animation-timing-function: ease-out;
  @keyframes expandRevisions {
    from {
      max-height: 40px;
    }
    to {
      max-height: 300px;
    }
  }
`;

const CopyWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;