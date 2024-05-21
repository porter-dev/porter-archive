import React, { useState } from "react";
import styled from "styled-components";

type Props = {
  maxHeight?: string;
  header: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  preExpanded?: boolean;
  alt?: boolean;
};

// TODO: support footer for consolidation w/ app services
const Expandable: React.FC<Props> = ({
  maxHeight,
  header,
  children,
  style,
  preExpanded,
  alt,
}) => {
  const [isExpanded, setIsExpanded] = useState(preExpanded || false);

  if (alt) {
    return (
      <StyledExpandable style={style}>
        <AltHeader
          isExpanded={isExpanded}
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
        >
          <span className="material-icons dropdown">arrow_drop_down</span>
          {header}
        </AltHeader>
        <AltExpandedContents isExpanded={isExpanded}>
          {children}
        </AltExpandedContents>
      </StyledExpandable>
    );
  }

  return (
    <StyledExpandable style={style}>
      <Header
        isExpanded={isExpanded}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        <span className="material-icons dropdown">arrow_drop_down</span>
        <FullWidth>{header}</FullWidth>
      </Header>
      <ExpandedContents
        isExpanded={isExpanded}
        maxHeight={maxHeight || "500px"}
      >
        {children}
      </ExpandedContents>
    </StyledExpandable>
  );
};

export default Expandable;

const ExpandedContents = styled.div<{
  isExpanded: boolean;
  maxHeight?: string;
}>`
  transition: all 0.5s;
  max-height: ${({ isExpanded, maxHeight }) => (isExpanded ? maxHeight : "0")};
  padding: ${({ isExpanded }) => (isExpanded ? "20px" : "0")};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  background: ${(props) => props.theme.fg + "66"};
  border: ${({ isExpanded }) => isExpanded && "1px solid #494b4f"};
  border-top: 0;
  color: ${(props) => props.theme.text.primary};
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  overflow-y: auto;
`;

const FullWidth = styled.div`
  width: 100%;
`;

const Header = styled.div<{ isExpanded: boolean }>`
  transition: all 0.2s;
  display: flex;
  align-items: center;
  height: 60px;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  border-bottom-left-radius: ${({ isExpanded }) => isExpanded && "0"};
  border-bottom-right-radius: ${({ isExpanded }) => isExpanded && "0"};

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -5px;
    margin-right: 8px;
    transform: ${({ isExpanded }) => !isExpanded && "rotate(-90deg)"};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledExpandable = styled.div`
  transition: all 0.2s;
`;

const AltHeader = styled.div<{ isExpanded: boolean }>`
  transition: all 0.2s;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #aaaabbaa;
  position: relative;
  :hover {
    color: ${(props) => props.theme.text.primary};
  }

  .dropdown {
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -5px;
    margin-right: 8px;
    transform: ${({ isExpanded }) => !isExpanded && "rotate(-90deg)"};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const AltExpandedContents = styled.div<{ isExpanded: boolean }>`
  transition: all 0.5s;
  margin-left: 4px;
  overflow: hidden;
  max-height: ${({ isExpanded }) => (isExpanded ? "500px" : "0")};
  padding-top: 10px;
  padding-left: ${({ isExpanded }) => (isExpanded ? "18px" : "0")};
  border-left: ${({ isExpanded }) => isExpanded && "1px solid #494b4f"};
  color: ${(props) => props.theme.text.primary};
`;
