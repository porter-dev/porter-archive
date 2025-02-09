import React from "react";

import Button from "./Button";
import Container from "./Container";
import Spacer from "./Spacer";
import Text from "./Text";

type Props = {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
};

const Pagination: React.FC<Props> = ({ page, setPage, totalPages }) => {
  return (
    <Container row spaced>
      <Text color="helper">
        Viewing page {page} out of {totalPages}
      </Text>
      <Container row>
        <Button
          onClick={() => {
            setPage(page - 1);
          }}
          disabled={page === 1}
          height="20px"
          color="fg"
          withBorder
        >
          Previous
        </Button>
        <Spacer inline x={0.5} />
        <Button
          onClick={() => {
            setPage(page + 1);
          }}
          disabled={page === totalPages}
          height="20px"
          color="fg"
          withBorder
        >
          Next
        </Button>
      </Container>
    </Container>
  );
};

export default Pagination;
