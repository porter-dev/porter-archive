import React, { Component } from "react";
import styled from "styled-components";
import rocket from "assets/rocket.png";
import Markdown from "markdown-to-jsx";

import { Context } from "shared/Context";

import { PorterTemplate } from "shared/types";
import Helper from "components/values-form/Helper";

import hardcodedNames from "../hardcodedNameDict";

type PropsType = {
  currentTemplate: any;
  currentTab: string;
  setCurrentTemplate: (x: PorterTemplate) => void;
  launchTemplate: () => void;
  markdown: string | null;
  keywords: string[];
};

type StateType = {};

export default class TemplateInfo extends Component<PropsType, StateType> {
  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  renderTagList = () => {
    if (this.props.keywords) {
      return this.props.keywords.map((tag: string, i: number) => {
        return <Tag key={i}>{tag}</Tag>;
      });
    }
  };

  renderMarkdown = () => {
    let { currentTemplate, markdown } = this.props;
    if (markdown) {
      return <Markdown>{markdown}</Markdown>;
    }
    return currentTemplate.description;
  };

  renderTagSection = () => {
    // Rendering doesn't make sense until search + clicking on tags is supported
    if (false && this.props.keywords && this.props.keywords.length > 0) {
      return (
        <TagSection>
          <i className="material-icons">local_offer</i>
          {this.renderTagList()}
        </TagSection>
      );
    }
  };

  renderBanner = () => {
    let { currentCluster } = this.context;
    if (!currentCluster) {
      return (
        <>
          <Br />
          <Banner>
            <i className="material-icons">error_outline</i>
            This project requires at least one cluster to launch a template.
          </Banner>
        </>
      );
    } else if (this.props.currentTab == "docker") {
      return (
        <>
          <Br />
          <Banner>
            <i className="material-icons-outlined">info</i>
            For instructions on connecting to your registry
            <Link
              target="_blank"
              href="https://docs.getporter.dev/docs/cli-documentation#pushing-docker-images-to-your-porter-image-registry"
            >
              refer to our docs
            </Link>
            .
          </Banner>
        </>
      );
    } else if (
      this.props.currentTemplate.name.toLowerCase() === "https-issuer"
    ) {
      return (
        <>
          <Br />
          <Banner>
            <i className="material-icons-outlined">info</i>
            To use this template you must first follow
            <Link
              target="_blank"
              href="https://docs.getporter.dev/docs/https-and-custom-domains"
            >
              Porter's HTTPS setup guide
            </Link>{" "}
            (5 minutes).
          </Banner>
        </>
      );
    }
  };

  render() {
    let { currentCluster } = this.context;
    let { name, icon, description } = this.props.currentTemplate;
    let { currentTemplate } = this.props;

    if (hardcodedNames[name]) {
      name = hardcodedNames[name];
    }

    return (
      <StyledExpandedTemplate>
        <TitleSection>
          <Flex>
            <i
              className="material-icons"
              onClick={() => this.props.setCurrentTemplate(null)}
            >
              keyboard_backspace
            </i>
            {icon
              ? this.renderIcon(icon)
              : this.renderIcon(currentTemplate.icon)}
            <Title>{name}</Title>
          </Flex>
          <Button
            isDisabled={!currentCluster}
            onClick={!currentCluster ? null : this.props.launchTemplate}
          >
            <img src={rocket} />
            Launch Template
          </Button>
        </TitleSection>
        <Helper>{description}</Helper>
        {this.renderTagSection()}
        <LineBreak />
        {this.renderBanner()}
        <ContentSection>{this.renderMarkdown()}</ContentSection>
      </StyledExpandedTemplate>
    );
  }
}

TemplateInfo.contextType = Context;

const Link = styled.a`
  color: #8590ff;
  margin-right: 5px;
  cursor: pointer;
  margin-left: 5px;
`;

const Br = styled.div`
  height: 5px;
  width: 100%;
`;

const Banner = styled.div`
  height: 40px;
  width: 100%;
  margin: 15px 0;
  font-size: 13px;
  display: flex;
  border-radius: 5px;
  padding-left: 15px;
  align-items: center;
  background: #ffffff11;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 30px 0px 13px;
`;

const ContentSection = styled.div`
  font-size: 14px;
  line-height: 1.8em;
  padding-bottom: 100px;
  overflow: hidden;
  user-select: text;
`;

const Tag = styled.div`
  border: 1px solid #ffffff44;
  border-radius: 3px;
  display: flex;
  margin-right: 7px;
  align-items: center;
  padding: 5px 10px;
`;

const TagSection = styled.div`
  margin-top: 25px;
  display: flex;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  align-items: center;

  > i {
    font-size: 18px;
    margin-right: 10px;
    color: #aaaabb;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    padding: 3px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Button = styled.div`
  height: 35px;
  background: ${(props: { isDisabled: boolean }) =>
    !props.isDisabled ? "#616feecc" : "#aaaabb"};
  :hover {
    background: ${(props: { isDisabled: boolean }) =>
      !props.isDisabled ? "#505edddd" : "#aaaabb"};
  }
  color: white;
  font-weight: 500;
  font-size: 13px;
  padding: 10px 15px;
  border-radius: 3px;
  cursor: ${(props: { isDisabled: boolean }) =>
    !props.isDisabled ? "pointer" : "default"};
  box-shadow: 0 5px 8px 0px #00000010;
  display: flex;
  flex-direction: row;
  align-items: center;

  > img {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    margin-right: 10px;
    justify-content: center;
  }
`;

const Icon = styled.img`
  width: 27px;
  margin-left: 14px;
  margin-right: 4px;
  margin-bottom: -1px;
`;

const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${(props) => props.theme.containerIcon};
    font-size: 24px;
    margin-left: 12px;
    margin-right: 3px;
  }
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  margin-left: 10px;
  border-radius: 2px;
  color: #ffffff;
`;

const TitleSection = styled.div`
  display: flex;
  margin-left: 0px;
  flex-direction: row;
  height: 40px;
  justify-content: space-between;
  width: 100%;
  align-items: center;
`;

const StyledExpandedTemplate = styled.div`
  width: 100%;
`;
