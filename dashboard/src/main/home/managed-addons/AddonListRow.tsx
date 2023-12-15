import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type UseFieldArrayUpdate } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";

import { type ClientAddon } from "lib/addons";

import postgresql from "assets/postgresql.svg";

import { type AppTemplateFormData } from "../cluster-dashboard/preview-environments/v2/setup-app/PreviewAppDataContainer";
import { PostgresTabs } from "./tabs/PostgresTabs";

type AddonRowProps = {
  index: number;
  addon: ClientAddon;
  update: UseFieldArrayUpdate<AppTemplateFormData, "addons">;
  remove: (index: number) => void;
};

export const AddonListRow: React.FC<AddonRowProps> = ({
  index,
  addon,
  update,
  remove,
}) => {
  const renderIcon = (): JSX.Element => <Icon src={postgresql} />;

  return (
    <>
      <AddonHeader
        showExpanded={addon.expanded}
        onClick={() => {
          update(index, {
            ...addon,
            expanded: !addon.expanded,
          });
        }}
        bordersRounded={!addon.expanded}
      >
        <AddonTitle>
          <ActionButton>
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {renderIcon()}
          {addon.name.value.trim().length > 0 ? addon.name.value : "New Addon"}
        </AddonTitle>

        {addon.canDelete && (
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              remove(index);
            }}
          >
            <span className="material-icons">delete</span>
          </ActionButton>
        )}
      </AddonHeader>
      <AnimatePresence>
        {addon.expanded && (
          <StyledSourceBox
            key={addon.name.value}
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
            showExpanded={addon.expanded}
          >
            <div
              style={{
                padding: "14px 25px 30px",
                border: "1px solid #494b4f",
              }}
            >
              {match(addon.config.type)
                .with("postgres", () => (
                  <PostgresTabs index={index} addon={addon} />
                ))
                .exhaustive()}
            </div>
          </StyledSourceBox>
        )}
      </AnimatePresence>
    </>
  );
};

const AddonTitle = styled.div`
  display: flex;
  align-items: center;
`;

const AddonHeader = styled.div<{
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
  height: 18px;
  margin-right: 15px;
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
