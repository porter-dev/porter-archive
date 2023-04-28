import React from "react";
import styled from "styled-components";

export type SourceType = "github" | "docker-registry";

interface SourceSelectorProps {
  selectedSourceType: SourceType | undefined;
  setSourceType: (sourceType: SourceType) => void;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({
  selectedSourceType,
  setSourceType
}) => {
  return (
    <BlockList>
      <Block
        selected={selectedSourceType === 'github'}
        onClick={() => setSourceType('github')}
      >
        <BlockIcon src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" />
        <BlockTitle>Git repository</BlockTitle>
        <BlockDescription>
          Deploy using source from a Git repo.
        </BlockDescription>
      </Block>
      <Block
        selected={selectedSourceType === 'docker-registry'}
        onClick={() => setSourceType('docker-registry')}
      >
        <BlockIcon src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png" />
        <BlockTitle>Docker registry</BlockTitle>
        <BlockDescription>
          Deploy a container from an image registry.
        </BlockDescription>
      </Block>

    </BlockList>
  );
}

export default SourceSelector;

const Block = styled.div<{ selected?: boolean }>`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 12px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: pointer;
  color: #ffffff;
  position: relative;

  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: ${props => props.selected ? "2px solid #8590ff" : "1px solid #494b4f"};
  :hover {
    border: ${({ selected }) => (!selected && "1px solid #7a7b80")};
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

const BlockList = styled.div`
  overflow: visible;
  margin-top: 6px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const BlockIcon = styled.img<{ bw?: boolean }>`
  height: 38px;
  padding: 2px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
`;

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const BlockTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
