import React from "react";
import styled from "styled-components";

import Container from "./Container";

type Props = {
  tileables: Tileable[];
  onSelect: (value: string) => void;
  selectedValue: string;
  widthPercentage?: number;
  gapPixels?: number;
};

type Tileable = {
  icon?: string;
  label: string;
  value: string;
  description?: string;
};

const Tiles: React.FC<Props> = ({
  tileables,
  onSelect,
  selectedValue,
  widthPercentage,
}) => {
  return (
    <TilesWrapper>
      <Container row spaced>
        {tileables.map((tileable: Tileable) => {
          const { label, value, icon, description } = tileable;
          return (
            <>
              <Tile
                key={value}
                onClick={() => {
                  onSelect(value);
                }}
                selected={selectedValue === value}
                widthPercentage={widthPercentage}
              >
                {icon && <Icon src={icon} />}
                <TileTitle>{label}</TileTitle>
                {description && (
                  <TileDescription>{description}</TileDescription>
                )}
              </Tile>
            </>
          );
        })}
      </Container>
    </TilesWrapper>
  );
};

export default Tiles;

const Icon = styled.img`
  height: 25px;
  margin-top: 30px;
`;

const TileDescription = styled.div`
  margin-bottom: 26px;
  color: #ffffff99;
  text-align: center;
  font-weight: default;
  padding: 0px 25px;
  line-height: 1.4;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TileTitle = styled.div`
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Tile = styled.div<{ selected: boolean; widthPercentage?: number }>`
  align-items: center;
  ${(props) => props.widthPercentage && `width: ${props.widthPercentage}%`};
  user-select: none;
  display: flex;
  font-size: 13px;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 180px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid ${(props) => (props.selected ? "#d7d1d1" : "#494b4f")};
  :hover {
    border: 1px solid #d7d1d1;
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

const TilesWrapper = styled.div`
  width: 100%;
  overflow: visible;
  margin-top: 15px;
  padding-bottom: 25px;
  display: grid;
  grid-column-gap: 30px;
  grid-row-gap: 30px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;
