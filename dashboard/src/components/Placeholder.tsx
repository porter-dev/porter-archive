import React from "react";
import styled from "styled-components";

interface Props {
  height?: string;
  minHeight?: string;
  children: React.ReactNode;
  title?: string;
}

const Placeholder: React.FC<Props> = ({ 
  height, 
  minHeight, 
  children,
  title,
}) => {
  return (
    <StyledPlaceholder height={height} minHeight={minHeight}>
      <Wrapper>
        <Title>{title}</Title>
        {children}
      </Wrapper>
    </StyledPlaceholder>
  );
};

export default Placeholder;

const Wrapper = styled.div`
  margin-bottom: 10px;
  display: flex;
  align-items: center;
`;

const Title = styled.div`
  font-size: 16px;
  color: white;
  font-weight: 500;
`;

const StyledPlaceholder = styled.div<{
  height: string;
  minHeight: string;
}>`
  width: 100%;
  height: ${(props) => props.height || "100px"};
  min-height: ${(props) => props.minHeight || ""};
  display: flex;
  align-items: center;
  color: #8D949E;
  padding: 50px;
  justify-content: center;
  font-size: 13px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  padding-bottom: 60px;

  > div {
    > i {
      font-size: 16px;
      margin-right: 12px;
    }
  }
`;
