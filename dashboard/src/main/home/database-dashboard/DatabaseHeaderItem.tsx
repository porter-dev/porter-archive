import React from "react";
import styled from "styled-components";

import CopyToClipboard from "components/CopyToClipboard";
import Container from "components/porter/Container";
import Text from "components/porter/Text";

import copy from "assets/copy-left.svg";

type DatabaseHeaderItemProps = {
  item: any;
};

const DatabaseHeaderItem: React.FC<DatabaseHeaderItemProps> = ({ item }) => {
  const truncateText = (text: string, length: number): string => {
    if (text.length <= length) {
      return text;
    }
    return `${text.substring(0, length)}...`;
  };

  return (
    <Container column>
      <Text size={12}>{item.name}</Text>

      <Container row>
        <Text title={item.value} color="helper" size={10}>{truncateText(item.value, 42)}</Text>
        <CopyToClipboard text={item.value.toString()}>
          <CopyIcon src={copy} alt="copy" />
        </CopyToClipboard>
      </Container>
    </Container>
  );
}

export default DatabaseHeaderItem;

const CopyIcon = styled.img`
      cursor: pointer;
      margin-left: 5px;
      margin-right: 5px;
      width: 10px;
      height: 10px;
      `;