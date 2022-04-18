import styled from "styled-components";
import DynamicLink from "components/DynamicLink";

export const EllipsisTextWrapper = styled.span`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RepoLink = styled(DynamicLink)`
  height: 22px;
  border-radius: 50px;
  margin-left: 6px;
  display: flex;
  font-size: 12px;
  cursor: pointer;
  color: #a7a6bb;
  align-items: center;
  justify-content: center;
  :hover {
    color: #ffffff;
    > i {
      color: #ffffff;
    }
  }

  > i {
    margin-right: 5px;
    color: #a7a6bb;
    font-size: 16px;
  }
`;
