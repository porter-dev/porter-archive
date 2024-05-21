import styled, { css } from "styled-components";

const textFontStack = css`
  font-family: "Work Sans", Arial, sans-serif;
`;

export const theme = {
  bg: {
    default: "#FFFFFF",
    reverse: "#16171A",
    wash: "#FAFAFA",
    divider: "#F6F7F8",
    border: "#EBECED",
    inactive: "#DFE7EF",
    shadeone: "#26292E",
    shadetwo: "#26292E",
  },
  line: {
    default: "1px solid #aaaabb33",
  },
  brand: {
    default: "#4400CC",
    alt: "#7B16FF",
    wash: "#E8E5FF",
    border: "#DDD9FF",
    dark: "#2A0080",
  },
  generic: {
    default: "#E6ECF7",
    alt: "#F6FBFC",
  },
  space: {
    default: "#0062D6",
    alt: "#1CD2F2",
    wash: "#E5F0FF",
    border: "#BDD8FF",
    dark: "#0F015E",
  },
  success: {
    default: "#00B88B",
    alt: "#00D5BD",
    dark: "#00663C",
    wash: "#D9FFF2",
    border: "#9FF5D9",
  },
  text: {
    default: "#ffffffaa",
    secondary: "#384047",
    alt: "#67717A",
    placeholder: "#7C8894",
    reverse: "#FFFFFF",
  },
  warn: {
    default: "#E22F2F",
    alt: "#E2197A",
    dark: "#85000C",
    wash: "#FFEDF6",
    border: "#FFCCE5",
  },
};

export const StyledTable = styled.table`
  width: 100%;
  min-width: 500px;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid #aaaabb33;
  border-spacing: 0;
`;

export const StyledTHead = styled.thead`
  width: 100%;
  position: sticky;

  > tr {
    background: ${theme.bg.shadeone};
    line-height: 2.2em;

    > th {
      border-bottom: ${theme.line.default};
    }
  }

  > tr:first-child {
    > th:first-child {
      border-top-left-radius: 6px;
      display: none;
    }

    > th:last-child {
      border-top-right-radius: 6px;
    }
  }
`;

export const StyledTBody = styled.tbody`
  > tr {
    background: ${theme.bg.shadetwo};
    height: 80px;
    line-height: 1.2em;

    > td {
      border-bottom: ${theme.line.default};
    }

    > td:first-child {
    }

    > td:last-child {
    }
  }

  > tr:last-child {
    > td:first-child {
      border-bottom-left-radius: 6px;
    }

    > td:last-child {
      border-bottom-right-radius: 6px;
    }

    > td {
      border-bottom: none;
    }
  }
`;

export const StyledTd = styled.td`
  ${textFontStack}
  font-size: 13px;
  color: ${theme.text.default};
  :first-child {
    padding-left: 20px;
  }

  :last-child {
  }

  user-select: text;
`;

export const StyledTh = styled.th`
  ${textFontStack}

  text-align: left;
  font-size: 13px;
  font-weight: 400;
  color: #ffffffaa;
  :first-child {
    padding-left: 20px;
  }
  :last-child {
    padding-right: 10px;
  }
`;
