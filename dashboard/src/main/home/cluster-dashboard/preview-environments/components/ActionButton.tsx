import styled, { css, keyframes } from "styled-components";

const Shake = keyframes`
10%, 90% {
  transform: translate3d(-0.5px, 0, 0);
}

20%, 80% {
  transform: translate3d(1px, 0, 0);
}

30%, 50%, 70% {
  transform: translate3d(-2px, 0, 0);
}

40%, 60% {
  transform: translate3d(2px, 0, 0);
}
`;

const ShakeAnimation = css`
  animation: ${Shake} 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
`;

export const ActionButton = styled.button`
  font-size: 12px;
  padding: 8px 10px;
  margin-left: 10px;
  border-radius: 5px;
  color: #ffffff;
  border: 1px solid
    ${(props: { disabled: boolean; hasError: boolean }) =>
      props.hasError ? "#dd4b4b" : "#aaaabb"};
  display: flex;
  align-items: center;
  background: ${(props: { disabled: boolean; hasError: boolean }) =>
    props.disabled ? "#ffffff22" : "#ffffff08"};
  cursor: pointer;
  min-height: 32px;
  min-width: 220px;
  :hover {
    background: #ffffff22;
  }

  ${(props: { disabled: boolean; hasError: boolean }) => {
    if (props.hasError) {
      return ShakeAnimation;
    }
  }}

  > i {
    font-size: 14px;
    margin-right: 8px;
  }
`;
