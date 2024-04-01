import styled from "styled-components";

export const CopyIcon = styled.img`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
  width: 15px;
  height: 15px;
  :hover {
    opacity: 0.8;
  }
`;

export const Code = styled.span`
  font-family: monospace;
`;

export const IdContainer = styled.div`
  background: #26292e;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  width: 550px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.border};
  align-items: center;
  user-select: text;
`;

export const CopyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;
