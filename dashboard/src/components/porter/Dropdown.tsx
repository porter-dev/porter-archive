import React, { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styled, { keyframes } from "styled-components";

import Container from "./Container";
import Spacer from "./Spacer";
import Tag from "./Tag";
import Text from "./Text";

type Props = {
  key: string;
  title: string;
  tag?: ReactNode;
  iconURL?: string;
  isDefaultOpen?: boolean;
  deleteFunc?: () => void;
  children: ReactNode;
};

const Dropdown: React.FC<Props> = ({
  title,
  tag,
  iconURL,
  isDefaultOpen = false,
  deleteFunc,
  children,
}) => {
  const [isOpenedState, setIsOpenedState] = React.useState(isDefaultOpen);

  return (
    <>
      <Header
        showExpanded={isOpenedState}
        onClick={() => {
          setIsOpenedState(!isOpenedState);
        }}
        bordersRounded={!isOpenedState}
      >
        <Title>
          <Container row>
            <ActionButton>
              <span className="material-icons dropdown">arrow_drop_down</span>
            </ActionButton>
            {iconURL && <Icon src={iconURL} />}
            {title}
            <Spacer inline x={0.5} />
            {tag}
          </Container>
        </Title>

        {deleteFunc && (
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              deleteFunc();
            }}
          >
            <span className="material-icons">delete</span>
          </ActionButton>
        )}
      </Header>
      <AnimatePresence>
        {isOpenedState && (
          <StyledSourceBox
            initial={{
              height: 0,
            }}
            animate={{
              height: "auto",
              transition: {
                duration: 0.3,
              },
            }}
            exit={{
              height: 0,
              transition: {
                duration: 0.3,
              },
            }}
            showExpanded={isDefaultOpen}
          >
            <div
              style={{
                padding: "14px 25px 30px",
                border: "1px solid #494b4f",
              }}
            >
              {children}
            </div>
          </StyledSourceBox>
        )}
      </AnimatePresence>
    </>
  );
};

export default Dropdown;

const Title = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const StyledSourceBox = styled(motion.div)<{
  showExpanded?: boolean;
  hasFooter?: boolean;
}>`
  overflow: hidden;
  color: #ffffff;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border-top: 0;
  border-bottom-left-radius: ${(props) => (props.hasFooter ? "0" : "5px")};
  border-bottom-right-radius: ${(props) => (props.hasFooter ? "0" : "5px")};
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  :hover {
    color: white;
  }

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;

const Header = styled.div<{
  showExpanded?: boolean;
  bordersRounded?: boolean;
}>`
  flex-direction: row;
  display: flex;
  height: 60px;
  justify-content: space-between;
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

  border-bottom-left-radius: ${(props) => (props.bordersRounded ? "" : "0")};
  border-bottom-right-radius: ${(props) => (props.bordersRounded ? "" : "0")};

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -10px;
    transform: ${(props: { showExpanded?: boolean }) =>
      props.showExpanded ? "" : "rotate(-90deg)"};
  }
`;

const Icon = styled.img`
  width: 27px;
  margin-right: 12px;
  margin-bottom: -1px;
`;
