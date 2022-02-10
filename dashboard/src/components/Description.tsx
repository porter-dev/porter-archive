import styled from "styled-components";

const Description = styled.div<{ margin?: string }>`
  width: 100%;
  color: white;
  font-size: 13px;
  color: #aaaabb;
  margin: ${(props) => props.margin || "20px 0 10px 0"};
  display: flex;
  align-items: center;
`;

export default Description;
