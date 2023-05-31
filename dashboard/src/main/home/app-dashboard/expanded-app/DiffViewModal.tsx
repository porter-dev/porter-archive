import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Modal from "components/porter/Modal";
import TitleSection from "components/TitleSection";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import danger from "assets/danger.svg";
import Anser, { AnserJsonEntry } from "anser";
import web from "assets/web-bold.png";
import settings from "assets/settings-bold.png";
import sliders from "assets/sliders.svg";

import dayjs from "dayjs";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Checkbox from "components/porter/Checkbox";
import { NavLink } from "react-router-dom";
import SidebarLink from "main/home/sidebar/SidebarLink";
import { EnvVariablesTab } from "./EnvVariablesTab";
type Props = {
  modalVisible: boolean;
  setModalVisible: (x: boolean) => void;
  serviceChild: any;
  //envChild: any;
};

const DiffViewModal: React.FC<Props> = ({
  serviceChild,
  //envChild,
  setModalVisible,
}) => {
  const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(true);
  const [currentView, setCurrentView] = useState("overview");

  return (
    <Modal closeModal={() => setModalVisible(false)} width={"1100px"}>
      <Text size={18}>Compare Diff</Text>

      <ContentWrapper>
        <StyledSidebar showSidebar={true}>
          <SidebarBg />
          <ScrollWrapper>
            <NavButton onClick={() => setCurrentView("overview")}>
              <Img src={web} />
              Overview
            </NavButton>
            <NavButton onClick={() => setCurrentView("environment")}>
              <Img src={sliders} />
              Environment
            </NavButton>
            <NavButton onClick={() => setCurrentView("buildSettings")}>
              <Img src={settings} />
              Build settings
            </NavButton>
          </ScrollWrapper>
        </StyledSidebar>

        <ContentView>
          {currentView === "overview" && (
            <ServiceChildContainer>
              <ServiceChild>
                <Text> Current </Text>
                {serviceChild}
              </ServiceChild>
              <SidebarBg />

              <ServiceChild>
                <Text> Revision No.5</Text>

                {serviceChild}
              </ServiceChild>
            </ServiceChildContainer>
          )}
          {currentView === "environment" && <div></div>}
          {currentView === "buildSettings" && (
            <div>
              <h2>Build Settings</h2>
              <p>Dummy content for build settings.</p>
            </div>
          )}
        </ContentView>
      </ContentWrapper>
    </Modal>
  );
};

export default DiffViewModal;
const ScrollWrapper = styled.div`
  overflow-y: auto;
  padding-bottom: 25px;
  max-height: calc(100vh - 95px);
`;

const ProjectPlaceholder = styled.div`
  background: #ffffff11;
  border-radius: 5px;
  margin: 0 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 100px);
  font-size: 13px;
  color: #aaaabb;
  padding-bottom: 80px;

  > img {
    width: 17px;
    margin-right: 10px;
  }
`;

const NavButton = styled(SidebarLink)`
  display: flex;
  align-items: center;
  border-radius: 5px;
  position: relative;
  text-decoration: none;
  height: 34px;
  margin: 5px 15px;
  padding: 0 30px 2px 6px;
  font-size: 13px;
  color: ${(props) => props.theme.text.primary};
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: any) => (props.active ? "#ffffff11" : "")};

  :hover {
    background: ${(props: any) => (props.active ? "#ffffff11" : "#ffffff08")};
  }

  &.active {
    background: #ffffff11;

    :hover {
      background: #ffffff11;
    }
  }

  :hover {
    background: #ffffff08;
  }

  > i {
    font-size: 18px;
    border-radius: 3px;
    margin-left: 2px;
    margin-right: 10px;
  }
`;

const Img = styled.img<{ enlarge?: boolean }>`
  padding: ${(props) => (props.enlarge ? "0 0 0 1px" : "4px")};
  height: 22px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 8px;
  opacity: 0.8;
`;

const SidebarBg = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-color: ${(props) => props.theme.bg};
  height: 100%;
  z-index: -1;
  border-right: 1px solid #383a3f;
`;

const SidebarLabel = styled.div`
  color: ${(props) => props.theme.text.primary};
  padding: 5px 23px;
  margin-bottom: 5px;
  font-size: 13px;
  z-index: 1;
`;

const PullTab = styled.div`
  position: fixed;
  width: 30px;
  height: 50px;
  background: #7a838f77;
  top: calc(50vh - 60px);
  left: 0;
  z-index: 1;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  cursor: pointer;

  :hover {
    background: #99a5af77;
  }

  > i {
    color: #ffffff77;
    font-size: 18px;
    position: absolute;
    top: 15px;
    left: 4px;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  right: -60px;
  top: 34px;
  min-width: 67px;
  height: 18px;
  padding-bottom: 2px;
  background: #383842dd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: white;
  font-size: 12px;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const CollapseButton = styled.div`
  position: absolute;
  right: 0;
  top: 8px;
  height: 23px;
  width: 23px;
  background: #525563aa;
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  cursor: pointer;

  :hover {
    background: #636674;
  }

  > i {
    color: #ffffff77;
    font-size: 14px;
    transform: rotate(180deg);
    position: absolute;
    top: 4px;
    right: 5px;
  }
`;

const StyledSidebar = styled.section`
  width: 240px;
  position: relative;
  padding-top: 20px;
  height: 75vh;
  z-index: 2;
  animation: ${(props: { showSidebar: boolean }) =>
    props.showSidebar ? "showSidebar 0.4s" : "hideSidebar 0.4s"};
  animation-fill-mode: forwards;
  @keyframes showSidebar {
    from {
      margin-left: -240px;
    }
    to {
      margin-left: 0px;
    }
  }
  @keyframes hideSidebar {
    from {
      margin-left: 0px;
    }
    to {
      margin-left: -240px;
    }
  }
`;
const ContentView = styled.div`
  flex 1;
  overflow: auto;
  padding: 20px;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 75vh;
`;
const ServiceChildContainer = styled.div`
  display: flex;
  height: 100%;
  justify-content: space-between;
  align-items: flex-start; // align top
`;

const ServiceChild = styled.div`
  width: calc(50% - 0.5px);
`;

const Divider = styled.div`
  width: 8px;

  background-color: white;
`;
